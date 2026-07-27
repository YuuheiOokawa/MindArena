import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { consumeUnseenAchievements } from "@/features/achievements/notify.service";

/**
 * Integration tests proving achievements actually unlock end-to-end: the Achievement/
 * PlayerAchievement machinery existed but nothing ever called achievementRepository.unlock —
 * checkAndUnlockAchievements (progress.service.ts) is the fix, wired into finalizeMatchResult.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `ach_${name}_${RUN_ID}`;
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
      await prisma.playerAchievement.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("achievements unlock on match completion and are announced once", () => {
  it("winning a first match unlocks FIRST_MATCH/FIRST_WIN/FIRST_CHAMPION, awards their bonus points, and the loser only gets FIRST_MATCH", async () => {
    const kai = await makeUser("kai");
    const rin = await makeUser("rin");
    await befriend(kai.userId, username("rin"), rin.userId);

    await sendChallenge(kai.userId, rin.profileId);
    const incoming = await listIncomingChallenges(rin.userId);
    const { tournamentId } = await acceptChallenge(rin.userId, incoming[0].challengeId);
    createdTournamentIds.push(tournamentId);

    const match = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId } });
    const [p1, p2] = await Promise.all([
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player1ParticipantId! } }),
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player2ParticipantId! } }),
    ]);
    const kaiParticipant = [p1, p2].find((p) => p.playerId === kai.profileId)!;
    const rinParticipant = [p1, p2].find((p) => p.playerId === rin.profileId)!;

    await finalizeMatchResult(
      match.id,
      { gameId: "trust-or-betray", sessionId: match.id, winnerParticipantId: kaiParticipant.id, loserParticipantId: rinParticipant.id, isDraw: false, finalScores: {}, rounds: [] },
      0,
      0,
    );

    const kaiUnlocked = await prisma.playerAchievement.findMany({ where: { playerProfileId: kai.profileId }, include: { achievement: true } });
    const kaiCodes = new Set(kaiUnlocked.map((u) => u.achievement.code));
    expect(kaiCodes.has("FIRST_MATCH")).toBe(true);
    expect(kaiCodes.has("FIRST_WIN")).toBe(true);
    expect(kaiCodes.has("FIRST_CHAMPION")).toBe(true);
    expect(kaiUnlocked.every((u) => u.notifiedAt === null)).toBe(true); // not yet consumed

    const rinUnlocked = await prisma.playerAchievement.findMany({ where: { playerProfileId: rin.profileId }, include: { achievement: true } });
    const rinCodes = new Set(rinUnlocked.map((u) => u.achievement.code));
    expect(rinCodes.has("FIRST_MATCH")).toBe(true);
    expect(rinCodes.has("FIRST_WIN")).toBe(false);
    expect(rinCodes.has("FIRST_CHAMPION")).toBe(false);

    // FIRST_MATCH(10) + FIRST_WIN(20) + FIRST_CHAMPION(100) = 130, awarded as flat ACHIEVEMENT_BONUS
    // transactions (not scaled by the league reward multiplier, unlike the CHAMPION award itself).
    const kaiBonusTx = await prisma.pointTransaction.findMany({ where: { playerProfileId: kai.profileId, reason: "ACHIEVEMENT_BONUS" } });
    expect(kaiBonusTx.reduce((sum, t) => sum + t.amount, 0)).toBe(130);

    const firstConsume = await consumeUnseenAchievements(kai.userId);
    const firstConsumeCodes = new Set(firstConsume.map((a) => a.code));
    expect(firstConsumeCodes).toEqual(new Set(["FIRST_MATCH", "FIRST_WIN", "FIRST_CHAMPION"]));

    const secondConsume = await consumeUnseenAchievements(kai.userId);
    expect(secondConsume).toEqual([]); // already marked notified — nothing left to announce

    const nowNotified = await prisma.playerAchievement.findMany({ where: { playerProfileId: kai.profileId } });
    expect(nowNotified.every((u) => u.notifiedAt !== null)).toBe(true);
  });
});
