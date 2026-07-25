import { prisma } from "@/infrastructure/database/prisma";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { toFriendCard } from "@/features/friends/friend-card.mapper";
import { fillWithBots } from "./bot-fill.service";
import { generateBracketForTournament } from "./progress.service";
import { awardPoints } from "@/features/points/award-points.service";
import { ParticipantType, PointReason, TournamentStatus, type BotDifficulty } from "@/domain/enums";
import { RECRUITING_WINDOW_SECONDS } from "@/config/tournament";
import { AppError } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

/**
 * Friends eligible to be invited to a tournament in the given league: an accepted friendship,
 * enough points to actually be allowed into that league (same league, or a higher one — a
 * lower-league friend couldn't join even if invited), and no tournament of their own already
 * running.
 */
export async function findInvitableFriends(profileId: string, league: { requiredPoints: number }) {
  const rows = await friendshipRepository.listFriends(profileId);
  const eligible: typeof rows = [];
  for (const row of rows) {
    if (row.friend.totalPoints < league.requiredPoints) continue;
    const active = await tournamentRepository.findActiveForPlayer(row.friend.id);
    if (active) continue;
    eligible.push(row);
  }
  return eligible;
}

/** Finalizes a RECRUITING tournament: BOT-fills whatever's left, generates the bracket, and
 * expires any invites nobody responded to in time. */
export async function finalizeRecruitingTournament(tournamentId: string) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament || tournament.status !== TournamentStatus.RECRUITING) return;

  await fillWithBots(tournamentId, tournament.league.botDifficulty as BotDifficulty, tournament.maxPlayers);
  await generateBracketForTournament(tournamentId);
  await tournamentInviteRepository.expireAllPending(tournamentId);
}

/** Called opportunistically whenever a RECRUITING tournament is viewed (matchmaking/bracket
 * polling) — finalizes it once it's full or the recruiting window has elapsed. There's no
 * background job in this app, so "due" is only ever discovered on the next poll. */
export async function finalizeIfDue(tournamentId: string) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament || tournament.status !== TournamentStatus.RECRUITING) return;

  const full = tournament.participants.length >= tournament.maxPlayers;
  const elapsedSeconds = (Date.now() - tournament.createdAt.getTime()) / 1000;
  if (full || elapsedSeconds >= RECRUITING_WINDOW_SECONDS) {
    await finalizeRecruitingTournament(tournamentId);
  }
}

/** Only the tournament's creator (seed 1) can force an early start instead of waiting out the
 * recruiting window. */
export async function startTournamentNow(userId: string, tournamentId: string) {
  const profile = await requireProfile(userId);
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) throw new AppError("NOT_FOUND", "トーナメントが見つかりません。");
  if (tournament.status !== TournamentStatus.RECRUITING) return;

  const creator = await tournamentParticipantRepository.findCreator(tournamentId);
  if (!creator || creator.playerId !== profile.id) {
    throw new AppError("FORBIDDEN", "この大会を開始できるのは作成者のみです。");
  }

  await finalizeRecruitingTournament(tournamentId);
}

export async function listIncomingTournamentInvites(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await tournamentInviteRepository.listIncomingPending(profile.id);
  return rows
    .filter((row) => row.tournament.status === TournamentStatus.RECRUITING)
    .map((row) => ({
      inviteId: row.id,
      createdAt: row.createdAt,
      tournamentId: row.tournament.id,
      leagueName: row.tournament.league.displayName,
      from: toFriendCard(row.inviter, row.inviter.user.username),
    }));
}

export async function acceptTournamentInvite(userId: string, inviteId: string) {
  const profile = await requireProfile(userId);
  const invite = await tournamentInviteRepository.findById(inviteId);
  if (!invite || invite.inviteeId !== profile.id) throw new AppError("NOT_FOUND", "招待が見つかりませんでした。");
  if (invite.status !== "PENDING") throw new AppError("CONFLICT", "この招待はすでに処理されています。");

  const active = await tournamentRepository.findActiveForPlayer(profile.id);
  if (active) throw new AppError("TOURNAMENT_NOT_JOINABLE", "すでに別のトーナメントに参加中です。");

  const tournament = await tournamentRepository.findById(invite.tournamentId);
  if (!tournament || tournament.status !== TournamentStatus.RECRUITING) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "この大会はすでに開始・終了しています。");
  }
  if (tournament.participants.length >= tournament.maxPlayers) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "この大会はすでに満員です。");
  }

  const league = await leagueRepository.findById(tournament.leagueId);
  if (!league) throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  if (profile.totalPoints < league.requiredPoints) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "このリーグはまだ解放されていません。");
  }

  await tournamentParticipantRepository.createMany([
    {
      tournamentId: tournament.id,
      playerId: profile.id,
      type: ParticipantType.HUMAN,
      displayName: profile.displayName,
      seed: tournament.participants.length + 1,
    },
  ]);

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
    await awardPoints(tx, {
      playerProfileId: profile.id,
      currentPoints: fresh.totalPoints,
      reason: PointReason.TOURNAMENT_ENTRY,
      league,
      tournamentId: tournament.id,
      leagueId: league.id,
    });
    await tx.playerProfile.update({ where: { id: profile.id }, data: { tournamentEntries: { increment: 1 } } });
  });

  await tournamentInviteRepository.accept(inviteId);
  await finalizeIfDue(tournament.id);

  return { tournamentId: tournament.id };
}

/** Powers the "フレンドと大会を開く" friend picker: which friends could actually be invited to
 * this league right now. */
export async function listInvitableFriendsForLeague(userId: string, leagueId: string) {
  const profile = await requireProfile(userId);
  const league = await leagueRepository.findById(leagueId);
  if (!league) throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  const rows = await findInvitableFriends(profile.id, league);
  return rows.map((row) => toFriendCard(row.friend, row.friend.user.username));
}

export async function declineTournamentInvite(userId: string, inviteId: string) {
  const profile = await requireProfile(userId);
  const invite = await tournamentInviteRepository.findById(inviteId);
  if (!invite || invite.inviteeId !== profile.id) throw new AppError("NOT_FOUND", "招待が見つかりませんでした。");
  if (invite.status !== "PENDING") return;
  await tournamentInviteRepository.decline(inviteId);
}
