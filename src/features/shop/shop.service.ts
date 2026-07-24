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

  await prisma.$transaction(async (tx) => {
    await tx.playerProfile.update({
      where: { id: profile.id },
      data: { prizeCurrency: { decrement: item.price! } },
    });
    await tx.cosmeticPurchase.create({ data: { playerProfileId: profile.id, cosmeticItemId } });
  });

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
