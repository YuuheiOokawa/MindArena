import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { friendChallengeRepository } from "@/infrastructure/repositories/friend-challenge.repository";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { withKeysLock } from "@/infrastructure/repositories/advisory-lock.repository";
import { awardPoints } from "@/features/points/award-points.service";
import { generateBracketForTournament } from "@/features/tournaments/progress.service";
import { getCurrentLeague } from "@/domain/services/league-progress.service";
import { FriendshipStatus, FriendChallengeStatus, ParticipantType, PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import { toFriendCard } from "./friend-card.mapper";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

async function requireNoActiveTournament(profileId: string, whoseMessage: string) {
  const active = await tournamentRepository.findActiveForPlayer(profileId);
  if (active) throw new AppError("CONFLICT", `${whoseMessage}すでに別のトーナメントに参加中です。`);
}

export async function sendChallenge(userId: string, opponentProfileId: string) {
  const profile = await requireProfile(userId);
  if (opponentProfileId === profile.id) throw new AppError("CANNOT_FRIEND_SELF", "自分自身には対戦を申し込めません。");

  const friendship = await friendshipRepository.findBetween(profile.id, opponentProfileId);
  if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
    throw new AppError("NOT_FOUND", "フレンドのみに対戦を申し込めます。");
  }

  const existing = await friendChallengeRepository.findPendingBetween(profile.id, opponentProfileId);
  if (existing) throw new AppError("CONFLICT", "すでに対戦の申し込みが送信されています。");

  await requireNoActiveTournament(profile.id, "あなたは");

  return friendChallengeRepository.create(profile.id, opponentProfileId);
}

export async function listIncomingChallenges(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await friendChallengeRepository.listIncoming(profile.id);
  return rows.map((row) => ({
    challengeId: row.id,
    createdAt: row.createdAt,
    from: toFriendCard(row.challenger, row.challenger.user.username),
  }));
}

export async function listOutgoingChallenges(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await friendChallengeRepository.listOutgoing(profile.id);
  return rows.map((row) => ({
    challengeId: row.id,
    createdAt: row.createdAt,
    to: toFriendCard(row.opponent, row.opponent.user.username),
  }));
}

/** Accepting creates a 2-player Tournament (maxPlayers=2) reusing the normal bracket/match/session
 * machinery — round 1 is also the final, so the winner gets the full champion payout. */
export async function acceptChallenge(userId: string, challengeId: string) {
  const profile = await requireProfile(userId);
  const challenge = await friendChallengeRepository.findById(challengeId);
  if (!challenge || challenge.opponentId !== profile.id) {
    throw new AppError("NOT_FOUND", "対戦の申し込みが見つかりませんでした。");
  }
  if (challenge.status !== FriendChallengeStatus.PENDING) {
    throw new AppError("CONFLICT", "この申し込みはすでに処理されています。");
  }

  // Locked on BOTH participants' ids so a double-click/retry (or the two of them racing another
  // join/accept elsewhere) can't create two tournaments and double-award TOURNAMENT_ENTRY points.
  // Nothing this callback calls (generateBracketForTournament) takes its own lock, so there's no
  // nested-lock deadlock risk here, unlike the tournament-invite flow.
  return withKeysLock([challenge.challengerId, challenge.opponentId], async () => {
    const freshChallenge = await friendChallengeRepository.findById(challengeId);
    if (!freshChallenge || freshChallenge.status !== FriendChallengeStatus.PENDING) {
      throw new AppError("CONFLICT", "この申し込みはすでに処理されています。");
    }

    // A friendship removed after the challenge was sent shouldn't still let a real tournament
    // (with real point payouts) get created between two accounts that are, per the friends
    // list, strangers again.
    const friendship = await friendshipRepository.findBetween(freshChallenge.challengerId, freshChallenge.opponentId);
    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new AppError("NOT_FOUND", "相手とはすでにフレンドではありません。");
    }

    await requireNoActiveTournament(freshChallenge.challengerId, "相手は");
    await requireNoActiveTournament(freshChallenge.opponentId, "あなたは");

    const challenger = await playerProfileRepository.findById(freshChallenge.challengerId);
    if (!challenger) throw new AppError("NOT_FOUND", "相手のプロフィールが見つかりませんでした。");
    const leagues = await leagueRepository.findAllActive();
    // currentLeagueId is only ever set at registration (see profile.service.ts's own live
    // computation from totalPoints) — trusting it here would pay out at the entry-league
    // multiplier forever, no matter how far the challenger has actually progressed.
    const league = getCurrentLeague(challenger.totalPoints, leagues);

    const tournament = await tournamentRepository.create(league.id, 2);

    await tournamentParticipantRepository.createMany([
      { tournamentId: tournament.id, playerId: challenger.id, type: ParticipantType.HUMAN, displayName: challenger.displayName, seed: 1 },
      { tournamentId: tournament.id, playerId: profile.id, type: ParticipantType.HUMAN, displayName: profile.displayName, seed: 2 },
    ]);

    await prisma.$transaction(async (tx) => {
      for (const p of [challenger, profile]) {
        const fresh = await tx.playerProfile.findUniqueOrThrow({ where: { id: p.id } });
        await awardPoints(tx, {
          playerProfileId: p.id,
          currentPoints: fresh.totalPoints,
          reason: PointReason.TOURNAMENT_ENTRY,
          league,
          tournamentId: tournament.id,
          leagueId: league.id,
        });
        await tx.playerProfile.update({ where: { id: p.id }, data: { tournamentEntries: { increment: 1 } } });
      }
    });

    await generateBracketForTournament(tournament.id);
    await friendChallengeRepository.accept(challengeId, tournament.id);

    return { tournamentId: tournament.id };
  });
}

export async function declineChallenge(userId: string, challengeId: string) {
  const profile = await requireProfile(userId);
  const challenge = await friendChallengeRepository.findById(challengeId);
  if (!challenge || (challenge.opponentId !== profile.id && challenge.challengerId !== profile.id)) {
    throw new AppError("NOT_FOUND", "対戦の申し込みが見つかりませんでした。");
  }
  if (challenge.status !== FriendChallengeStatus.PENDING) {
    throw new AppError("CONFLICT", "この申し込みはすでに処理されています。");
  }
  await friendChallengeRepository.decline(challengeId);
}
