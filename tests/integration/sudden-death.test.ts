import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { startOrResumeSession, submitPlayerAction } from "@/features/games/core/session-service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";

/**
 * Integration coverage for the "延長戦(サドンデス)が同点のままだとプレイヤーが自動的に勝者になる"
 * concern raised for this round: both TRUST_OR_BETRAY sides choosing TRUST every round is a
 * guaranteed tie (scoreRound: TRUST/TRUST -> +1/+1 both sides), which deterministically drives a
 * match through the full "3 regular rounds tied -> 1 sudden-death round tied -> server coin flip"
 * path (features/games/core/session-service.ts + domain/services/tiebreak.ts) every single time —
 * letting us assert the coin flip is not biased toward either participant.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `sd_${name}_${RUN_ID}`;
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

/** Creates a fresh 2-human TRUST_OR_BETRAY match (round 1 of a friend challenge is also the
 * final) and returns both sides' participant ids. */
async function createAlwaysDrawMatch(tagA: string, tagB: string) {
  const a = await makeUser(`${tagA}_${Math.random().toString(36).slice(2, 8)}`);
  const b = await makeUser(`${tagB}_${Math.random().toString(36).slice(2, 8)}`);
  await befriend(a.userId, (await prisma.user.findUniqueOrThrow({ where: { id: b.userId } })).username, b.userId);

  await sendChallenge(a.userId, b.profileId);
  const incoming = await listIncomingChallenges(b.userId);
  const { tournamentId } = await acceptChallenge(b.userId, incoming[0].challengeId);
  createdTournamentIds.push(tournamentId);

  // The challenge's game is picked randomly — force TRUST_OR_BETRAY for this test since it's the
  // only game whose scoring table has a guaranteed-tie move (TRUST/TRUST -> +1/+1 both sides).
  const rawMatch = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId } });
  const gameType = await prisma.gameType.findUniqueOrThrow({ where: { code: "TRUST_OR_BETRAY" } });
  const match = await prisma.tournamentMatch.update({ where: { id: rawMatch.id }, data: { gameTypeId: gameType.id } });

  const [p1, p2] = await Promise.all([
    prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player1ParticipantId! } }),
    prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player2ParticipantId! } }),
  ]);
  const participantA = [p1, p2].find((p) => p.playerId === a.profileId)!;
  const participantB = [p1, p2].find((p) => p.playerId === b.profileId)!;

  await startOrResumeSession(match.id, participantA.id);
  await startOrResumeSession(match.id, participantB.id);

  return { matchId: match.id, participantAId: participantA.id, participantBId: participantB.id };
}

async function playAlwaysTrustRound(matchId: string, participantAId: string, participantBId: string, round: number) {
  await submitPlayerAction(matchId, participantAId, { round, actionType: "DECLARE", actionData: { choice: "TRUST" } });
  await submitPlayerAction(matchId, participantBId, { round, actionType: "DECLARE", actionData: { choice: "TRUST" } });
  await submitPlayerAction(matchId, participantAId, { round, actionType: "CHOOSE", actionData: { choice: "TRUST" } });
  await submitPlayerAction(matchId, participantBId, { round, actionType: "CHOOSE", actionData: { choice: "TRUST" } });
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.gameAction.deleteMany({ where: { gameSession: { tournamentMatch: { tournamentId } } } });
    await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
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

describe("sudden death draw resolution", () => {
  it("plays exactly one extra sudden-death round when regulation ends tied, then decides via server coin flip — never leaving the match a draw", async () => {
    const { matchId, participantAId, participantBId } = await createAlwaysDrawMatch("a1", "b1");

    await playAlwaysTrustRound(matchId, participantAId, participantBId, 1);
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 2);
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 3);

    // Regulation (3 rounds) is a guaranteed 3-3 tie — the match must NOT be finalized yet; it
    // should have silently extended into a 4th, sudden-death round instead.
    const midResult = await prisma.matchResult.findUnique({ where: { tournamentMatchId: matchId } });
    expect(midResult).toBeNull();
    const sessionAfterRegulation = await prisma.gameSession.findUniqueOrThrow({ where: { tournamentMatchId: matchId } });
    expect((sessionAfterRegulation.state as { totalRounds: number }).totalRounds).toBe(4);
    expect((sessionAfterRegulation.state as { tiebreakApplied?: boolean }).tiebreakApplied).toBe(true);

    // The sudden-death round is ALSO a guaranteed tie (TRUST/TRUST again) — this is the exact
    // scenario the bug report describes. The match must still resolve to a single decisive
    // winner via the server-side coin flip, not silently declare a "player" side the winner.
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 4);

    const finalResult = await prisma.matchResult.findUniqueOrThrow({ where: { tournamentMatchId: matchId } });
    expect(finalResult.winnerParticipantId).not.toBeNull();
    expect(finalResult.loserParticipantId).not.toBeNull();
    expect([participantAId, participantBId]).toContain(finalResult.winnerParticipantId);
    expect(finalResult.winnerParticipantId).not.toBe(finalResult.loserParticipantId);

    // "isDraw" must never survive into the persisted result — MatchResult always records a
    // single winner, and finalizeMatchResult itself throws if given a null winner/loser, so a
    // genuinely-still-tied result could never have reached this row at all.
    const resultData = finalResult.resultData as { isDraw?: boolean };
    expect(resultData.isDraw).not.toBe(true);
  });

  it("the sudden-death coin flip is not biased toward either side across many independent matches", async () => {
    // 24 independently-created matches, each driven through 4 full rounds via real service
    // calls — genuinely slow against a real Postgres instance, hence the generous timeout.
    const outcomes: string[] = []; // "A" or "B" per trial, relative to each trial's own two sides

    for (let i = 0; i < 24; i++) {
      const { matchId, participantAId, participantBId } = await createAlwaysDrawMatch(`fair${i}a`, `fair${i}b`);
      await playAlwaysTrustRound(matchId, participantAId, participantBId, 1);
      await playAlwaysTrustRound(matchId, participantAId, participantBId, 2);
      await playAlwaysTrustRound(matchId, participantAId, participantBId, 3);
      await playAlwaysTrustRound(matchId, participantAId, participantBId, 4);

      const result = await prisma.matchResult.findUniqueOrThrow({ where: { tournamentMatchId: matchId } });
      outcomes.push(result.winnerParticipantId === participantAId ? "A" : "B");
    }

    const aWins = outcomes.filter((o) => o === "A").length;
    const bWins = outcomes.length - aWins;
    // A truly biased implementation (e.g. "default to the first mover") would produce all 24
    // wins on one side. A fair coin flip should land within a generous band of 50/50 — this is
    // a statistical smoke test, not a strict binomial assertion, so it tolerates normal variance
    // while still failing hard on a fully deterministic bug.
    expect(aWins).toBeGreaterThan(2);
    expect(bWins).toBeGreaterThan(2);
  }, 30000);

  it("finalizing the same match result twice does not double-award points, stats, or advance the tournament twice (idempotency)", async () => {
    const { matchId, participantAId, participantBId } = await createAlwaysDrawMatch("idem-a", "idem-b");
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 1);
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 2);
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 3);
    await playAlwaysTrustRound(matchId, participantAId, participantBId, 4);

    const result = await prisma.matchResult.findUniqueOrThrow({ where: { tournamentMatchId: matchId } });
    const winnerParticipant = await prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: result.winnerParticipantId! } });
    const winnerProfileBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { id: winnerParticipant.playerId! } });

    // Re-run finalization for the already-completed match — this simulates a retried/duplicated
    // API call. finalizeMatchResult's own findUnique(MatchResult) short-circuit must make this a
    // pure no-op.
    await finalizeMatchResult(
      matchId,
      { gameId: "trust-or-betray", sessionId: matchId, winnerParticipantId: winnerParticipant.id, loserParticipantId: winnerParticipant.id === participantAId ? participantBId : participantAId, isDraw: false, finalScores: {}, rounds: [] },
      0,
      0,
    );

    const winnerProfileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: winnerParticipant.playerId! } });
    expect(winnerProfileAfter.totalPoints).toBe(winnerProfileBefore.totalPoints);
    expect(winnerProfileAfter.totalWins).toBe(winnerProfileBefore.totalWins);
    expect(winnerProfileAfter.totalMatches).toBe(winnerProfileBefore.totalMatches);
    expect(winnerProfileAfter.tournamentWins).toBe(winnerProfileBefore.tournamentWins);
  });
});
