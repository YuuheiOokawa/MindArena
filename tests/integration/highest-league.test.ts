import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { awardPoints } from "@/features/points/award-points.service";
import { PointReason } from "@/domain/enums";

/**
 * Integration tests for 最高到達リーグ (highest-ever-league) tracking — a high-water mark
 * distinct from currentLeagueId, needed because elimination penalties (see
 * elimination-penalty.test.ts) can now legitimately move currentLeagueId DOWN as totalPoints
 * drops, whereas highestLeagueId must never regress.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `highleague_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id };
}

/** Directly grants/deducts points via the same awardPoints() path every real point award uses,
 * bypassing the league reward-multiplier calculation via overrideAmount so the exact totalPoints
 * delta is controlled precisely. */
async function grantPoints(profileId: string, amount: number) {
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId }, include: { currentLeague: true } });
  await prisma.$transaction((tx) =>
    awardPoints(tx, {
      playerProfileId: profileId,
      currentPoints: profile.totalPoints,
      reason: amount >= 0 ? PointReason.ROUND_1_CLEAR : PointReason.ROUND_1_ELIMINATION,
      league: profile.currentLeague,
      overrideAmount: amount,
    }),
  );
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

describe("highest league reached tracking", () => {
  it("sets highestLeagueId on the very first point award", async () => {
    const user = await makeUser("first");
    await grantPoints(user.profileId, 10);

    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    const bronze = await prisma.league.findUniqueOrThrow({ where: { code: "BRONZE" } });
    expect(profile.highestLeagueId).toBe(bronze.id);
    expect(profile.highestLeagueAt).not.toBeNull();
  });

  it("does not decrease highestLeagueId when an elimination penalty drops currentLeagueId", async () => {
    const user = await makeUser("elim");
    const silver = await prisma.league.findUniqueOrThrow({ where: { code: "SILVER" } });

    // Cross into Silver.
    await grantPoints(user.profileId, silver.requiredPoints + 50);
    const afterRise = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(afterRise.currentLeagueId).toBe(silver.id);
    expect(afterRise.highestLeagueId).toBe(silver.id);

    // Elimination-style penalty drops totalPoints back below Silver's threshold.
    await grantPoints(user.profileId, -100);
    const afterDrop = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    const bronze = await prisma.league.findUniqueOrThrow({ where: { code: "BRONZE" } });
    expect(afterDrop.currentLeagueId).toBe(bronze.id);
    // highestLeagueId must still reflect Silver — the high-water mark never regresses.
    expect(afterDrop.highestLeagueId).toBe(silver.id);
    expect(afterDrop.highestLeagueAt).toEqual(afterRise.highestLeagueAt);
  });

  it("updates highestLeagueId when a new personal-best league is reached", async () => {
    const user = await makeUser("newbest");
    const silver = await prisma.league.findUniqueOrThrow({ where: { code: "SILVER" } });
    const gold = await prisma.league.findUniqueOrThrow({ where: { code: "GOLD" } });

    await grantPoints(user.profileId, silver.requiredPoints + 50);
    const afterSilver = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(afterSilver.highestLeagueId).toBe(silver.id);

    await grantPoints(user.profileId, gold.requiredPoints - silver.requiredPoints);
    const afterGold = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(afterGold.currentLeagueId).toBe(gold.id);
    expect(afterGold.highestLeagueId).toBe(gold.id);
    expect(afterGold.highestLeagueAt!.getTime()).toBeGreaterThanOrEqual(afterSilver.highestLeagueAt!.getTime());
  });
});
