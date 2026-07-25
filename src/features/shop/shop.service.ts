import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { cosmeticItemRepository } from "@/infrastructure/repositories/cosmetic-item.repository";
import { cosmeticPurchaseRepository } from "@/infrastructure/repositories/cosmetic-purchase.repository";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/infrastructure/database/prisma";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

export async function getShopCatalog(userId: string) {
  const profile = await requireProfile(userId);
  const [items, purchases] = await Promise.all([
    cosmeticItemRepository.findAllActive(),
    cosmeticPurchaseRepository.listForPlayer(profile.id),
  ]);

  const ownedItemIds = new Set(purchases.map((p) => p.cosmeticItemId));

  const shopItems = items
    .filter((item) => item.price !== null)
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      price: item.price!,
      assetKey: item.assetKey,
      owned: ownedItemIds.has(item.id),
    }));

  return {
    prizeCurrency: profile.prizeCurrency,
    lifetimePrizeCurrency: profile.lifetimePrizeCurrency,
    items: shopItems,
    selectedBackgroundId: profile.selectedBackgroundId,
    selectedBadgeId: profile.selectedBadgeId,
  };
}

export async function purchaseShopItem(userId: string, cosmeticItemId: string) {
  const profile = await requireProfile(userId);

  const item = await prisma.cosmeticItem.findUnique({ where: { id: cosmeticItemId } });
  if (!item || item.price === null || !item.isActive) {
    throw new AppError("NOT_FOUND", "このアイテムはショップにありません。");
  }

  const existing = await cosmeticPurchaseRepository.findOne(profile.id, cosmeticItemId);
  if (existing) throw new AppError("ALREADY_OWNED");

  if (profile.prizeCurrency < item.price) throw new AppError("INSUFFICIENT_FUNDS");

  try {
    await prisma.$transaction(async (tx) => {
      // A conditional UPDATE (not a plain decrement) so two concurrent purchases racing the same
      // balance can't both succeed: the second one's WHERE re-evaluates against the row AFTER
      // the first commits and correctly sees the now-lower balance, rather than both reading the
      // same stale `profile.prizeCurrency` snapshot from above and both passing the check.
      const debited = await tx.playerProfile.updateMany({
        where: { id: profile.id, prizeCurrency: { gte: item.price! } },
        data: { prizeCurrency: { decrement: item.price! } },
      });
      if (debited.count === 0) throw new AppError("INSUFFICIENT_FUNDS");

      await tx.cosmeticPurchase.create({ data: { playerProfileId: profile.id, cosmeticItemId } });
    });
  } catch (error) {
    // The same item purchased twice in the same instant hits @@unique([playerProfileId,
    // cosmeticItemId]) inside the transaction — the whole transaction (including the debit)
    // rolls back automatically, so translate that into the same friendly error the upfront
    // check above would have given a non-racing caller, instead of a raw 500.
    if (error instanceof AppError) throw error;
    throw new AppError("ALREADY_OWNED");
  }

  return { purchased: true, itemId: cosmeticItemId };
}

export async function equipShopCosmetic(userId: string, category: "BACKGROUND" | "BADGE", itemId: string | null) {
  const profile = await requireProfile(userId);

  if (itemId !== null) {
    const item = await prisma.cosmeticItem.findUnique({ where: { id: itemId } });
    if (!item || item.category !== category || item.price === null) {
      throw new AppError("NOT_FOUND", "このアイテムはショップにありません。");
    }

    const owned = await cosmeticPurchaseRepository.findOne(profile.id, itemId);
    if (!owned) throw new AppError("ITEM_NOT_OWNED");
  }

  const field = category === "BACKGROUND" ? "selectedBackgroundId" : "selectedBadgeId";
  return playerProfileRepository.update(profile.id, { [field]: itemId });
}
