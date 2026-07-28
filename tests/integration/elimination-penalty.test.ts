import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { MatchStatus, ParticipantStatus, ParticipantType, PointReason, TournamentStatus } from "@/domain/enums";

/**
 * Integration tests for the ベスト4未到達時のリーグポイント減少 (elimination penalty) feature:
 * losing before round 4 ("ベスト4") now costs league points, scaled by the losing player's
 * league, while a round-4 ("ベスト4") loss stays exactly as before — no penalty. Each test builds
 * a minimal single-match "tournament" directly (rather than a full 32-player bracket) so the
 * round the player is eliminated at can be controlled precisely.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `elim_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];
const createdTournamentIds: string[] = [];

async function makeUser(name: string, leagueCode = "BRONZE") {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  if (leagueCode !== "BRONZE") {
    const league = await prisma.league.findUniqueOrThrow({ where: { code: leagueCode } });
    // Give enough totalPoints to genuinely sit in the target league, then re-point currentLeagueId
    // to match — mirrors what syncCurrentLeague would have already done for a real player.
    await prisma.playerProfile.update({ where: { id: profile.id }, data: { totalPoints: league.requiredPoints + 100, currentLeagueId: league.id } });
  }
  // Pre-unlock FIRST_MATCH so this test's very first simulated loss doesn't also trigger its
  // +10 ACHIEVEMENT_BONUS — that's real, correct, unrelated behavior (config/achievements.ts)
  // that would otherwise confound every totalPoints assertion below.
  const firstMatchAchievement = await prisma.achievement.findUniqueOrThrow({ where: { code: "FIRST_MATCH" } });
  await prisma.playerAchievement.create({ data: { playerProfileId: profile.id, achievementId: firstMatchAchievement.id } });
  return { userId: user.id, profileId: profile.id };
}

/** Builds a single-match "tournament" (round N of a 32-player bracket) with a HUMAN participant
 * about to lose to a BOT, and finalizes it as a loss for the human. Returns the resulting
 * PointTransaction rows created for that human by this match, most-recent first. */
async function loseAtRound(profileId: string, round: number) {
  const [league, gameType, bot] = await Promise.all([
    prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId } }).then((p) => prisma.league.findUniqueOrThrow({ where: { id: p.currentLeagueId } })),
    prisma.gameType.findFirstOrThrow({ where: { isActive: true } }),
    prisma.botProfile.findFirstOrThrow({ where: { isActive: true } }),
  ]);

  const tournament = await prisma.tournament.create({
    data: { leagueId: league.id, status: TournamentStatus.IN_PROGRESS, maxPlayers: 32, currentRound: round, startedAt: new Date() },
  });
  createdTournamentIds.push(tournament.id);

  const humanParticipant = await prisma.tournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId: profileId, type: ParticipantType.HUMAN, displayName: "human", seed: 1, status: ParticipantStatus.ACTIVE },
  });
  const botParticipant = await prisma.tournamentParticipant.create({
    data: { tournamentId: tournament.id, botId: bot.id, type: ParticipantType.BOT, displayName: bot.name, seed: 2, status: ParticipantStatus.ACTIVE },
  });
  const match = await prisma.tournamentMatch.create({
    data: {
      tournamentId: tournament.id,
      round,
      matchNumber: 1,
      player1ParticipantId: humanParticipant.id,
      player2ParticipantId: botParticipant.id,
      gameTypeId: gameType.id,
      status: MatchStatus.IN_PROGRESS,
    },
  });

  const before = await prisma.pointTransaction.findMany({ where: { playerProfileId: profileId } });
  const beforeIds = new Set(before.map((t) => t.id));

  await finalizeMatchResult(
    match.id,
    { gameId: "trust-or-betray", sessionId: match.id, winnerParticipantId: botParticipant.id, loserParticipantId: humanParticipant.id, isDraw: false, finalScores: {}, rounds: [] },
    0,
    0,
  );

  const after = await prisma.pointTransaction.findMany({ where: { playerProfileId: profileId }, orderBy: { createdAt: "desc" } });
  // Excludes ACHIEVEMENT_BONUS — a fresh player's very first match also unlocks FIRST_MATCH
  // (config/achievements.ts), which is legitimate and unrelated to the elimination penalty this
  // suite is testing, but would otherwise show up as a second "new" transaction in every case.
  return after.filter((t) => !beforeIds.has(t.id) && t.reason !== PointReason.ACHIEVEMENT_BONUS);
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("elimination point penalty", () => {
  it("does not penalize a round-4 (ベスト4) loss", async () => {
    const user = await makeUser("best4");
    const profileBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });

    const newTransactions = await loseAtRound(user.profileId, 4);

    expect(newTransactions).toHaveLength(0);
    const profileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(profileAfter.totalPoints).toBe(profileBefore.totalPoints);
  });

  it("penalizes a round-3 (ベスト8) loss", async () => {
    const user = await makeUser("best8");
    const newTransactions = await loseAtRound(user.profileId, 3);

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0].reason).toBe(PointReason.QUARTERFINAL_ELIMINATION);
    expect(newTransactions[0].amount).toBeLessThan(0);
    expect(newTransactions[0].round).toBe(3);
  });

  it("penalizes a round-2 (ベスト16) loss", async () => {
    const user = await makeUser("best16");
    const newTransactions = await loseAtRound(user.profileId, 2);

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0].reason).toBe(PointReason.ROUND_2_ELIMINATION);
    expect(newTransactions[0].amount).toBeLessThan(0);
  });

  it("penalizes a round-1 (1回戦) loss, and it's the largest of the three penalties", async () => {
    const user = await makeUser("round1");
    const newTransactions = await loseAtRound(user.profileId, 1);

    expect(newTransactions).toHaveLength(1);
    expect(newTransactions[0].reason).toBe(PointReason.ROUND_1_ELIMINATION);
    expect(newTransactions[0].amount).toBeLessThan(0);

    // Same-league magnitude ordering: earlier exit costs strictly more than a later one.
    const round1Amount = Math.abs(newTransactions[0].amount);
    const round2User = await makeUser("cmp16");
    const round2Tx = await loseAtRound(round2User.profileId, 2);
    const round3User = await makeUser("cmp8");
    const round3Tx = await loseAtRound(round3User.profileId, 3);

    expect(round1Amount).toBeGreaterThan(Math.abs(round2Tx[0].amount));
    expect(Math.abs(round2Tx[0].amount)).toBeGreaterThan(Math.abs(round3Tx[0].amount));
  });

  it("a higher league loses more points than a lower league for the same elimination round", async () => {
    const bronzeUser = await makeUser("penbronze", "BRONZE");
    const mindKingUser = await makeUser("penmk", "MIND_KING");

    const bronzeTx = await loseAtRound(bronzeUser.profileId, 1);
    const mindKingTx = await loseAtRound(mindKingUser.profileId, 1);

    expect(Math.abs(mindKingTx[0].amount)).toBeGreaterThan(Math.abs(bronzeTx[0].amount));
  });

  it("never takes totalPoints below zero, even for a player near the floor", async () => {
    const user = await makeUser("floor");
    await prisma.playerProfile.update({ where: { id: user.profileId }, data: { totalPoints: 5 } });

    await loseAtRound(user.profileId, 1); // base penalty -20 at Bronze multiplier 1.0 — would go negative without the floor

    const profileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(profileAfter.totalPoints).toBe(0);
  });

  it("records the elimination in point transaction history with the correct round and reason", async () => {
    const user = await makeUser("history");
    await prisma.playerProfile.update({ where: { id: user.profileId }, data: { totalPoints: 500 } }); // headroom, away from the floor clamp
    const newTransactions = await loseAtRound(user.profileId, 2);

    const stored = await prisma.pointTransaction.findFirstOrThrow({ where: { id: newTransactions[0].id } });
    expect(stored.round).toBe(2);
    expect(stored.reason).toBe(PointReason.ROUND_2_ELIMINATION);
    expect(stored.balanceAfter).toBe(stored.balanceBefore + stored.amount);
  });
});
