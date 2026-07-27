import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { getDailyBonusStatus, claimDailyBonus } from "@/features/daily-bonus/daily-bonus.service";
import { getDailyBonusTier } from "@/config/daily-bonus";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `db_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id };
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("daily login bonus", () => {
  it("is claimable for a fresh account at day 1, and rejects a second claim the same day", async () => {
    const alice = await makeUser("alice");

    const before = await getDailyBonusStatus(alice.userId);
    expect(before.claimable).toBe(true);
    expect(before.currentStreak).toBe(0);
    expect(before.nextStreakDay).toBe(1);

    const day1Tier = getDailyBonusTier(1);
    const claim = await claimDailyBonus(alice.userId);
    expect(claim.streakDay).toBe(1);
    expect(claim.tier).toEqual(day1Tier);

    const after = await getDailyBonusStatus(alice.userId);
    expect(after.claimable).toBe(false);
    expect(after.currentStreak).toBe(1);

    await expect(claimDailyBonus(alice.userId)).rejects.toThrow(AppError);

    if (day1Tier.points > 0) {
      const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: alice.profileId } });
      expect(profile.totalPoints).toBe(day1Tier.points);
      const tx = await prisma.pointTransaction.findMany({ where: { playerProfileId: alice.profileId, reason: "DAILY_BONUS" } });
      expect(tx).toHaveLength(1);
      expect(tx[0].amount).toBe(day1Tier.points);
    }
  });

  it("continues the streak into day 2 when the previous claim was JST-yesterday, and awards prizeCurrency on the day-3 tier", async () => {
    const bob = await makeUser("bob");
    await claimDailyBonus(bob.userId); // day 1

    // Backdate the claim to JST-yesterday so the next claim continues the streak instead of resetting.
    await prisma.playerProfile.update({
      where: { id: bob.profileId },
      data: { lastLoginBonusClaimedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const status = await getDailyBonusStatus(bob.userId);
    expect(status.claimable).toBe(true);
    expect(status.nextStreakDay).toBe(2);

    await claimDailyBonus(bob.userId); // day 2

    // Backdate again to reach day 3, which pays out prizeCurrency per config/daily-bonus.ts.
    await prisma.playerProfile.update({
      where: { id: bob.profileId },
      data: { lastLoginBonusClaimedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const day3Tier = getDailyBonusTier(3);
    const claim = await claimDailyBonus(bob.userId); // day 3
    expect(claim.streakDay).toBe(3);
    expect(day3Tier.prizeCurrency).toBeGreaterThan(0);

    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: bob.profileId } });
    expect(profile.loginBonusStreak).toBe(3);
    expect(profile.prizeCurrency).toBe(day3Tier.prizeCurrency);
    expect(profile.lifetimePrizeCurrency).toBe(day3Tier.prizeCurrency);
  });

  it("resets the streak to day 1 after a missed day", async () => {
    const carol = await makeUser("carol");
    await claimDailyBonus(carol.userId); // day 1

    // Backdate by 2 full days — a real gap, not "yesterday".
    await prisma.playerProfile.update({
      where: { id: carol.profileId },
      data: { lastLoginBonusClaimedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });

    const claim = await claimDailyBonus(carol.userId);
    expect(claim.streakDay).toBe(1);
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: carol.profileId } });
    expect(profile.loginBonusStreak).toBe(1);
  });

  it("only lets one of two concurrent claims succeed", async () => {
    const dave = await makeUser("dave");
    const results = await Promise.allSettled([claimDailyBonus(dave.userId), claimDailyBonus(dave.userId)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: dave.profileId } });
    expect(profile.loginBonusStreak).toBe(1);
    const tx = await prisma.pointTransaction.findMany({ where: { playerProfileId: dave.profileId, reason: "DAILY_BONUS" } });
    expect(tx).toHaveLength(1); // not double-awarded
  });
});
