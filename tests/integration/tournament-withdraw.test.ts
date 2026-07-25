import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { createFriendTournament } from "@/features/tournaments/join.service";
import { withdrawFromTournament } from "@/features/tournaments/withdraw.service";
import { acceptTournamentInvite } from "@/features/tournaments/invite.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { gameTypeRepository } from "@/infrastructure/repositories/game-type.repository";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { AppError } from "@/lib/errors/app-error";
import { ParticipantType } from "@/domain/enums";

/**
 * Integration tests for withdrawing (棄権) from a tournament: covers leaving a RECRUITING lobby
 * (as creator and as a joined friend), forfeiting a live IN_PROGRESS match, and the trickier case
 * of withdrawing while waiting between rounds (no live match yet) — which relies on
 * progress.service.ts's resolveWithdrawnMatchesForRound to auto-forfeit the player's next match
 * the instant it's generated.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `wd_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];
const createdTournamentIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id };
}

async function befriend(userIdA: string, usernameB: string, userIdB: string) {
  await sendFriendRequest(userIdA, usernameB);
  const incoming = await listIncomingFriendRequests(userIdB);
  await acceptFriendRequest(userIdB, incoming[0].friendshipId);
}

async function cleanupTournament(tournamentId: string) {
  await prisma.tournamentInvite.deleteMany({ where: { tournamentId } });
  await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
  await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
  await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
  await prisma.tournament.deleteMany({ where: { id: tournamentId } });
}

let bronzeLeagueId: string;

beforeAll(async () => {
  const bronze = await prisma.league.findFirst({ where: { code: "BRONZE" } });
  if (!bronze) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  bronzeLeagueId = bronze.id;
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await cleanupTournament(tournamentId);
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("withdrawing from a RECRUITING lobby", () => {
  it("cancels the whole tournament when the creator withdraws", async () => {
    const alice = await makeUser("alice_recruit");
    const bob = await makeUser("bob_recruit");
    await befriend(alice.userId, username("bob_recruit"), bob.userId);

    const tournament = await createFriendTournament(alice.userId, bronzeLeagueId, [bob.profileId]);
    createdTournamentIds.push(tournament!.id);

    await withdrawFromTournament(alice.userId, tournament!.id);

    const fresh = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament!.id } });
    expect(fresh.status).toBe("CANCELLED");
    const remainingParticipants = await prisma.tournamentParticipant.count({ where: { tournamentId: tournament!.id } });
    expect(remainingParticipants).toBe(0);
  });

  it("just removes the leaving friend's seat, leaving the lobby RECRUITING for everyone else", async () => {
    const carol = await makeUser("carol_recruit");
    const dave = await makeUser("dave_recruit");
    await befriend(carol.userId, username("dave_recruit"), dave.userId);

    const tournament = await createFriendTournament(carol.userId, bronzeLeagueId, [dave.profileId]);
    createdTournamentIds.push(tournament!.id);

    const daveInvite = await prisma.tournamentInvite.findFirstOrThrow({ where: { tournamentId: tournament!.id, inviteeId: dave.profileId } });
    await acceptTournamentInvite(dave.userId, daveInvite.id);

    // Dave (not the creator) leaves — only his own seat should go away.
    await withdrawFromTournament(dave.userId, tournament!.id);

    const fresh = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament!.id }, include: { participants: true } });
    expect(fresh.status).toBe("RECRUITING");
    expect(fresh.participants.map((p) => p.playerId)).toEqual([carol.profileId]);
  });

  it("rejects withdrawing a second time once the tournament is already cancelled", async () => {
    const eve = await makeUser("eve_recruit");
    const felix = await makeUser("felix_recruit");
    await befriend(eve.userId, username("felix_recruit"), felix.userId);

    const tournament = await createFriendTournament(eve.userId, bronzeLeagueId, [felix.profileId]);
    createdTournamentIds.push(tournament!.id);

    await withdrawFromTournament(eve.userId, tournament!.id);
    await expect(withdrawFromTournament(eve.userId, tournament!.id)).rejects.toThrow(AppError);
  });
});

describe("withdrawing from an IN_PROGRESS match", () => {
  it("forfeits the live match — the opponent wins as if the withdrawing player had lost normally", async () => {
    const frank = await makeUser("frank_live");
    const grace = await makeUser("grace_live");
    await befriend(frank.userId, username("grace_live"), grace.userId);

    await sendChallenge(frank.userId, grace.profileId);
    const incoming = await listIncomingChallenges(grace.userId);
    const { tournamentId } = await acceptChallenge(grace.userId, incoming[0].challengeId);
    createdTournamentIds.push(tournamentId);

    const frankProfileBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { id: frank.profileId } });

    await withdrawFromTournament(frank.userId, tournamentId);

    const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId }, include: { matches: true } });
    expect(tournament.status).toBe("COMPLETED");
    expect(tournament.matches).toHaveLength(1);
    expect(tournament.matches[0].status).toBe("COMPLETED");

    const graceProfile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: grace.profileId } });
    expect(graceProfile.tournamentWins).toBeGreaterThan(0);

    const frankProfileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: frank.profileId } });
    // Round 1 is also the final in a 2-player bracket, so forfeiting is treated exactly like a
    // real loss in the final — frank still gets the RUNNER_UP award on top of his entry points,
    // same as if he'd actually played and lost.
    expect(frankProfileAfter.totalPoints).toBeGreaterThan(frankProfileBefore.totalPoints);
  });

  it("rejects withdrawing again once already withdrawn", async () => {
    const henry = await makeUser("henry_live");
    const ivan = await makeUser("ivan_live");
    await befriend(henry.userId, username("ivan_live"), ivan.userId);

    await sendChallenge(henry.userId, ivan.profileId);
    const incoming = await listIncomingChallenges(ivan.userId);
    const { tournamentId } = await acceptChallenge(ivan.userId, incoming[0].challengeId);
    createdTournamentIds.push(tournamentId);

    await withdrawFromTournament(henry.userId, tournamentId);
    await expect(withdrawFromTournament(henry.userId, tournamentId)).rejects.toThrow(AppError);
  });
});

describe("withdrawing while waiting between rounds (no live match yet)", () => {
  it("auto-forfeits the player's next match the instant it's generated, instead of leaving their would-be opponent waiting", async () => {
    // Build a controlled 4-player bracket directly: julia and kevin are real accounts (one of
    // whom will withdraw mid-wait), laura and mike are bots standing in for the other pairing so
    // this doesn't depend on two more real users independently playing out their match.
    const julia = await makeUser("julia_wait");
    const kevin = await makeUser("kevin_wait");

    const tournament = await tournamentRepository.create(bronzeLeagueId, 4);
    createdTournamentIds.push(tournament.id);

    const bots = await prisma.botProfile.findMany({ take: 2 });
    expect(bots.length).toBeGreaterThanOrEqual(2);

    await tournamentParticipantRepository.createMany([
      { tournamentId: tournament.id, playerId: julia.profileId, type: ParticipantType.HUMAN, displayName: "julia", seed: 1 },
      { tournamentId: tournament.id, playerId: kevin.profileId, type: ParticipantType.HUMAN, displayName: "kevin", seed: 2 },
      { tournamentId: tournament.id, botId: bots[0].id, type: ParticipantType.BOT, displayName: bots[0].name, seed: 3 },
      { tournamentId: tournament.id, botId: bots[1].id, type: ParticipantType.BOT, displayName: bots[1].name, seed: 4 },
    ]);

    const gameTypes = await gameTypeRepository.findAllActive();
    const participants = await tournamentParticipantRepository.listForTournament(tournament.id);
    const [p1, p2, p3, p4] = participants.sort((a, b) => a.seed - b.seed);

    // Round 1: julia vs kevin (match A), the two bots (match B) — created directly rather than
    // via generateBracketForTournament so the pairing (and therefore who's "waiting" on whom) is
    // deterministic for the test, not shuffled.
    await prisma.tournamentMatch.createMany({
      data: [
        { tournamentId: tournament.id, round: 1, matchNumber: 1, player1ParticipantId: p1.id, player2ParticipantId: p2.id, gameTypeId: gameTypes[0].id, status: "READY" },
        { tournamentId: tournament.id, round: 1, matchNumber: 2, player1ParticipantId: p3.id, player2ParticipantId: p4.id, gameTypeId: gameTypes[0].id, status: "READY" },
      ],
    });
    await tournamentRepository.update(tournament.id, { status: "IN_PROGRESS", currentRound: 1, startedAt: new Date() });

    const matchA = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId: tournament.id, matchNumber: 1 } });

    // julia beats kevin in match A — julia has now won round 1, but round 1 isn't complete yet
    // (match B, the bots, hasn't been played), so julia has no live match right now.
    await finalizeMatchResult(
      matchA.id,
      { gameId: "trust-or-betray", sessionId: matchA.id, winnerParticipantId: p1.id, loserParticipantId: p2.id, isDraw: false, finalScores: {}, rounds: [] },
      1,
      0,
    );

    const juliaLiveMatch = await tournamentMatchRepository.findForPlayer(tournament.id, p1.id);
    expect(juliaLiveMatch).toBeNull();

    // julia withdraws while waiting — should succeed even with no live match to forfeit.
    await withdrawFromTournament(julia.userId, tournament.id);

    const juliaParticipant = await prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: p1.id } });
    expect(juliaParticipant.status).toBe("WITHDRAWN");

    // Now the bots' match (match B) finishes, completing round 1 and triggering round-2 pairing
    // of julia vs whichever bot won — which should be instantly auto-forfeited in julia's favor
    // of her opponent, since julia is WITHDRAWN.
    const matchB = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId: tournament.id, matchNumber: 2 } });
    await finalizeMatchResult(
      matchB.id,
      { gameId: "trust-or-betray", sessionId: matchB.id, winnerParticipantId: p3.id, loserParticipantId: p4.id, isDraw: false, finalScores: {}, rounds: [] },
      1,
      0,
    );

    const finalTournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id }, include: { matches: true } });
    // A 4-player bracket is only 2 rounds — round 2 is the final, so p3 (the bot julia would have
    // faced) should now be the champion, without anyone ever needing to play a round-2 match.
    expect(finalTournament.status).toBe("COMPLETED");
    expect(finalTournament.winnerParticipantId).toBe(p3.id);

    const round2Match = finalTournament.matches.find((m) => m.round === 2);
    expect(round2Match?.status).toBe("COMPLETED");
    expect(round2Match?.winnerParticipantId).toBe(p3.id);
  });
});
