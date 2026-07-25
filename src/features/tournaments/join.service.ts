import { prisma } from "@/infrastructure/database/prisma";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { ParticipantType, PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import { awardPoints } from "@/features/points/award-points.service";
import { findInvitableFriends, finalizeRecruitingTournament } from "./invite.service";

/**
 * Joins (or resumes) a tournament for the given league. MVP has no live human matchmaking
 * queue (docs/09_TOURNAMENT_DESIGN.md), so by default the remaining seats are filled with BOTs
 * and the bracket generated immediately. If the player has friends eligible for this league
 * (same league, or higher — see invite.service.ts) who aren't already mid-tournament, they're
 * invited instead: the tournament stays RECRUITING for a short window so they have a real chance
 * to join the same bracket before BOTs take the remaining seats (features/tournaments/invite.service.ts's
 * finalizeIfDue, triggered lazily whenever the tournament is polled).
 */
export async function joinTournament(userId: string, leagueId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const league = await leagueRepository.findById(leagueId);
  if (!league || !league.isActive) throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  if (profile.totalPoints < league.requiredPoints) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "このリーグはまだ解放されていません。");
  }

  const active = await tournamentRepository.findActiveForPlayer(profile.id);
  if (active) return active;

  const tournament = await tournamentRepository.create(leagueId, 32);

  await tournamentParticipantRepository.createMany([
    { tournamentId: tournament.id, playerId: profile.id, type: ParticipantType.HUMAN, displayName: profile.displayName, seed: 1 },
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

  const invitable = await findInvitableFriends(profile.id, league);
  if (invitable.length > 0) {
    await tournamentInviteRepository.createMany(tournament.id, profile.id, invitable.map((row) => row.friend.id));
  } else {
    // Nobody to wait for — keep the original instant behavior exactly as before.
    await finalizeRecruitingTournament(tournament.id);
  }

  return tournamentRepository.findById(tournament.id);
}

/** A deliberate friend-only lobby: like joinTournament, but the creator hand-picks exactly which
 * friends get invited instead of auto-inviting every eligible one. Always waits (even if the
 * picked list turns out empty after eligibility filtering, the creator can still "start now"). */
export async function createFriendTournament(userId: string, leagueId: string, inviteeProfileIds: string[]) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const league = await leagueRepository.findById(leagueId);
  if (!league || !league.isActive) throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  if (profile.totalPoints < league.requiredPoints) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "このリーグはまだ解放されていません。");
  }
  if (inviteeProfileIds.length === 0) {
    throw new AppError("VALIDATION_ERROR", "招待するフレンドを1人以上選んでください。");
  }

  const active = await tournamentRepository.findActiveForPlayer(profile.id);
  if (active) throw new AppError("TOURNAMENT_NOT_JOINABLE", "すでに別のトーナメントに参加中です。");

  const invitable = await findInvitableFriends(profile.id, league);
  const invitableIds = new Set(invitable.map((row) => row.friend.id));
  const validIds = inviteeProfileIds.filter((id) => invitableIds.has(id));
  if (validIds.length === 0) {
    throw new AppError("VALIDATION_ERROR", "招待できるフレンドが選ばれていません。");
  }

  const tournament = await tournamentRepository.create(leagueId, 32);

  await tournamentParticipantRepository.createMany([
    { tournamentId: tournament.id, playerId: profile.id, type: ParticipantType.HUMAN, displayName: profile.displayName, seed: 1 },
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

  await tournamentInviteRepository.createMany(tournament.id, profile.id, validIds);

  return tournamentRepository.findById(tournament.id);
}
