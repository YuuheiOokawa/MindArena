import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { claimDailyBonus } from "@/features/daily-bonus/daily-bonus.service";
import { getDailyMissionsStatus, claimDailyMission } from "@/features/daily-missions/daily-missions.service";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `dm_${name}_${RUN_ID}`;
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

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.dailyMissionClaim.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("daily missions", () => {
  it("starts at zero progress for a fresh account", async () => {
    const alice = await makeUser("alice");
    const missions = await getDailyMissionsStatus(alice.userId);
    expect(missions.every((m) => !m.completed && !m.claimed)).toBe(true);
    expect(missions.find((m) => m.code === "PLAY_ONE_MATCH")?.progress).toBe(0);
  });

  it("completes the login-bonus mission the moment the daily bonus is claimed", async () => {
    const bob = await makeUser("bob");
    await claimDailyBonus(bob.userId);

    const missions = await getDailyMissionsStatus(bob.userId);
    const loginMission = missions.find((m) => m.code === "CLAIM_LOGIN_BONUS")!;
    expect(loginMission.completed).toBe(true);
    expect(loginMission.claimed).toBe(false);
  });

  it("marks PLAY_ONE_MATCH complete for both sides and WIN_ONE_MATCH only for the winner, then pays out on claim", async () => {
    const carol = await makeUser("carol");
    const dave = await makeUser("dave");
    await befriend(carol.userId, username("dave"), dave.userId);

    await sendChallenge(carol.userId, dave.profileId);
    const incoming = await listIncomingChallenges(dave.userId);
    const { tournamentId } = await acceptChallenge(dave.userId, incoming[0].challengeId);
    createdTournamentIds.push(tournamentId);

    const match = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId } });
    const [p1, p2] = await Promise.all([
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player1ParticipantId! } }),
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player2ParticipantId! } }),
    ]);
    const carolParticipant = [p1, p2].find((p) => p.playerId === carol.profileId)!;
    const daveParticipant = [p1, p2].find((p) => p.playerId === dave.profileId)!;

    await finalizeMatchResult(
      match.id,
      { gameId: "trust-or-betray", sessionId: match.id, winnerParticipantId: carolParticipant.id, loserParticipantId: daveParticipant.id, isDraw: false, finalScores: {}, rounds: [] },
      0,
      0,
    );

    const carolMissions = await getDailyMissionsStatus(carol.userId);
    expect(carolMissions.find((m) => m.code === "PLAY_ONE_MATCH")?.completed).toBe(true);
    expect(carolMissions.find((m) => m.code === "WIN_ONE_MATCH")?.completed).toBe(true);

    const daveMissions = await getDailyMissionsStatus(dave.userId);
    expect(daveMissions.find((m) => m.code === "PLAY_ONE_MATCH")?.completed).toBe(true);
    expect(daveMissions.find((m) => m.code === "WIN_ONE_MATCH")?.completed).toBe(false);

    const winMission = carolMissions.find((m) => m.code === "WIN_ONE_MATCH")!;
    // carol already won the friend-challenge "tournament" itself, which independently awards
    // prizeCurrency (awardChampionPrize) — assert the mission claim's own delta, not an absolute.
    const profileBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { id: carol.profileId } });
    await claimDailyMission(carol.userId, "WIN_ONE_MATCH");
    const profileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: carol.profileId } });
    expect(profileAfter.prizeCurrency - profileBefore.prizeCurrency).toBe(winMission.rewardPrizeCurrency);

    // Can't claim twice, and can't claim an incomplete mission.
    await expect(claimDailyMission(carol.userId, "WIN_ONE_MATCH")).rejects.toThrow(AppError);
    await expect(claimDailyMission(dave.userId, "WIN_ONE_MATCH")).rejects.toThrow(AppError);
  });

  it("only lets one of two concurrent claims for the same mission succeed", async () => {
    const erin = await makeUser("erin");
    await claimDailyBonus(erin.userId); // completes CLAIM_LOGIN_BONUS

    const results = await Promise.allSettled([
      claimDailyMission(erin.userId, "CLAIM_LOGIN_BONUS"),
      claimDailyMission(erin.userId, "CLAIM_LOGIN_BONUS"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const tx = await prisma.pointTransaction.findMany({ where: { playerProfileId: erin.profileId, reason: "DAILY_BONUS" } });
    // One transaction from claimDailyBonus itself, one from the single successful mission claim.
    expect(tx).toHaveLength(2);
  });

  it("treats stale daily counters (from a previous day) as reset to zero", async () => {
    const frank = await makeUser("frank");
    await prisma.playerProfile.update({
      where: { id: frank.profileId },
      data: { dailyMissionDate: "2000-01-01", dailyMatchesPlayed: 5, dailyWins: 5 },
    });

    const missions = await getDailyMissionsStatus(frank.userId);
    expect(missions.find((m) => m.code === "PLAY_ONE_MATCH")?.progress).toBe(0);
    expect(missions.find((m) => m.code === "WIN_ONE_MATCH")?.completed).toBe(false);
  });
});
