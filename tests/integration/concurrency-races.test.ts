import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { joinTournament } from "@/features/tournaments/join.service";
import { purchaseShopItem } from "@/features/shop/shop.service";
import { AppError } from "@/lib/errors/app-error";
import { PointReason } from "@/domain/enums";

/**
 * Regression coverage for the advisory-lock fixes: two requests racing the exact same
 * check-then-act window (double-click, a retried request) must never both succeed. These
 * intentionally fire the two calls via Promise.all rather than sequentially, so the race is
 * real, not simulated.
 */

const RUN_ID = Date.now();
const RACER_USERNAME = `race_join_${RUN_ID}`;
const SHOPPER_USERNAME = `race_shop_${RUN_ID}`;

let racerUserId: string;
let shopperUserId: string;

beforeAll(async () => {
  const bronze = await prisma.league.findFirst({ where: { code: "BRONZE" } });
  if (!bronze) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");

  const racer = await registerUser({
    username: RACER_USERNAME,
    email: `${RACER_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  racerUserId = racer.id;

  const shopper = await registerUser({
    username: SHOPPER_USERNAME,
    email: `${SHOPPER_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  shopperUserId = shopper.id;
});

afterAll(async () => {
  for (const userId of [racerUserId, shopperUserId].filter(Boolean)) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.cosmeticPurchase.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
      const tournaments = await prisma.tournamentParticipant.findMany({ where: { playerId: profile.id } });
      for (const p of tournaments) {
        await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId: p.tournamentId } } });
        await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId: p.tournamentId } } });
        await prisma.tournamentMatch.deleteMany({ where: { tournamentId: p.tournamentId } });
        await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: p.tournamentId } });
        await prisma.tournament.deleteMany({ where: { id: p.tournamentId } });
      }
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("joinTournament race", () => {
  it("only creates one tournament and awards TOURNAMENT_ENTRY points exactly once when two requests race", async () => {
    const bronze = await prisma.league.findFirstOrThrow({ where: { code: "BRONZE" } });
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: racerUserId } });

    const [a, b] = await Promise.all([
      joinTournament(racerUserId, bronze.id),
      joinTournament(racerUserId, bronze.id),
    ]);

    expect(a!.id).toBe(b!.id);

    const tournamentCount = await prisma.tournamentParticipant.count({ where: { playerId: profile.id } });
    expect(tournamentCount).toBe(1);

    const entryAwards = await prisma.pointTransaction.count({
      where: { playerProfileId: profile.id, reason: PointReason.TOURNAMENT_ENTRY },
    });
    expect(entryAwards).toBe(1);
  });
});

describe("purchaseShopItem race", () => {
  it("only lets one of two concurrent purchases succeed when the balance can't cover both", async () => {
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: shopperUserId } });
    const items = await prisma.cosmeticItem.findMany({
      where: { price: { not: null }, isActive: true },
      orderBy: { price: "asc" },
      take: 2,
    });
    expect(items.length).toBe(2);
    const [itemA, itemB] = items;
    const startingBalance = itemA.price! - 1 + itemB.price!; // covers exactly one purchase, not both
    await prisma.playerProfile.update({ where: { id: profile.id }, data: { prizeCurrency: startingBalance } });

    const [resultA, resultB] = await Promise.allSettled([
      purchaseShopItem(shopperUserId, itemA.id),
      purchaseShopItem(shopperUserId, itemB.id),
    ]);

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => r.status === "fulfilled");
    const failed = outcomes.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(AppError);

    const fresh = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect(fresh.prizeCurrency).toBeGreaterThanOrEqual(0);

    const purchaseCount = await prisma.cosmeticPurchase.count({ where: { playerProfileId: profile.id } });
    expect(purchaseCount).toBe(1);
  });
});
