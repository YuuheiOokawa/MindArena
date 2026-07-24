import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { getShopCatalog, purchaseShopItem, equipShopCosmetic } from "@/features/shop/shop.service";
import { AppError } from "@/lib/errors/app-error";

/**
 * Integration tests for the shop's purchase/equip flow against a real Postgres database.
 * Currency is set directly on the profile (rather than driving a full tournament to a
 * championship) since the award side of the flow — awardChampionPrize/awardLeagueTrophy in
 * progress.service.ts — is exercised by e2e/tournament-run.spec.ts's full championship run.
 */

const TEST_USERNAME = `shop_user_${Date.now()}`;
const TEST_EMAIL = `${TEST_USERNAME}@example.com`;

let userId: string;
let profileId: string;
let cheapItemId: string;
let expensiveItemId: string;

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) {
    throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  }

  const user = await registerUser({
    username: TEST_USERNAME,
    email: TEST_EMAIL,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  userId = user.id;

  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
  profileId = profile.id;
  await prisma.playerProfile.update({ where: { id: profileId }, data: { prizeCurrency: 250 } });

  const items = await prisma.cosmeticItem.findMany({ where: { price: { not: null } }, orderBy: { price: "asc" } });
  cheapItemId = items[0].id; // seeded at 200 (BADGE_FLAME/BADGE_STAR)
  expensiveItemId = items[items.length - 1].id; // seeded at 800 (BG_ROYAL)
});

afterAll(async () => {
  await prisma.cosmeticPurchase.deleteMany({ where: { playerProfileId: profileId } });
  await prisma.playerProfile.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("shop purchase and equip flow", () => {
  it("lists the catalog with prizeCurrency and unowned items", async () => {
    const catalog = await getShopCatalog(userId);
    expect(catalog.prizeCurrency).toBe(250);
    expect(catalog.items.length).toBeGreaterThan(0);
    expect(catalog.items.find((i) => i.id === cheapItemId)?.owned).toBe(false);
  });

  it("rejects a purchase that costs more than the current balance", async () => {
    await expect(purchaseShopItem(userId, expensiveItemId)).rejects.toThrow(AppError);
  });

  it("rejects equipping an item that hasn't been purchased", async () => {
    const item = await prisma.cosmeticItem.findUniqueOrThrow({ where: { id: cheapItemId } });
    await expect(
      equipShopCosmetic(userId, item.category as "BACKGROUND" | "BADGE", cheapItemId),
    ).rejects.toThrow(AppError);
  });

  it("purchases an affordable item and deducts the price from prizeCurrency", async () => {
    const before = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId } });
    const item = await prisma.cosmeticItem.findUniqueOrThrow({ where: { id: cheapItemId } });

    await purchaseShopItem(userId, cheapItemId);

    const after = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId } });
    expect(after.prizeCurrency).toBe(before.prizeCurrency - item.price!);

    const catalog = await getShopCatalog(userId);
    expect(catalog.items.find((i) => i.id === cheapItemId)?.owned).toBe(true);
  });

  it("rejects purchasing the same item twice", async () => {
    await expect(purchaseShopItem(userId, cheapItemId)).rejects.toThrow(AppError);
  });

  it("equips a purchased item, then unequips it with a null itemId", async () => {
    const item = await prisma.cosmeticItem.findUniqueOrThrow({ where: { id: cheapItemId } });
    const category = item.category as "BACKGROUND" | "BADGE";

    await equipShopCosmetic(userId, category, cheapItemId);
    const equipped = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId } });
    const field = category === "BACKGROUND" ? "selectedBackgroundId" : "selectedBadgeId";
    expect(equipped[field]).toBe(cheapItemId);

    await equipShopCosmetic(userId, category, null);
    const unequipped = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileId } });
    expect(unequipped[field]).toBeNull();
  });
});
