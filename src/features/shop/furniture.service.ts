import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { furnitureItemRepository } from "@/infrastructure/repositories/furniture-item.repository";
import { ownedFurnitureRepository } from "@/infrastructure/repositories/owned-furniture.repository";
import { AppError } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

/** Furniture shop catalog — every active item, annotated with this player's ownership/afford-
 * ability/league status so the shop card can render "購入不可" reasons without a second round trip. */
export async function getFurnitureCatalog(userId: string) {
  const profile = await requireProfile(userId);
  const [items, owned] = await Promise.all([furnitureItemRepository.findAllActive(), ownedFurnitureRepository.listForPlayer(profile.id)]);
  const ownedByItemId = new Map(owned.map((o) => [o.shopItemId, o]));

  return {
    prizeCurrency: profile.prizeCurrency,
    items: items.map((item) => {
      const ownedRow = ownedByItemId.get(item.id);
      const leagueUnlocked = !item.requiredLeague || profile.totalPoints >= item.requiredLeague.requiredPoints;
      const alreadyOwned = Boolean(ownedRow);
      const canBuyMore = item.stackable || !alreadyOwned;
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        price: item.price,
        width: item.width,
        height: item.height,
        colorKey: item.colorKey,
        stackable: item.stackable,
        requiredLeague: item.requiredLeague ? { displayName: item.requiredLeague.displayName, themeKey: item.requiredLeague.themeKey } : null,
        leagueUnlocked,
        owned: alreadyOwned,
        ownedQuantity: ownedRow?.quantity ?? 0,
        canPurchase: leagueUnlocked && canBuyMore && profile.prizeCurrency >= item.price,
      };
    }),
  };
}

/** Buys one copy of a furniture item — race-safe the same way shop.service.ts's
 * purchaseShopItem is (conditional balance UPDATE, not a plain decrement), and additionally
 * validates existence/active/league/funds/ownership server-side rather than trusting the
 * client's view of any of them. */
export async function purchaseFurnitureItem(userId: string, shopItemId: string) {
  const profile = await requireProfile(userId);

  const item = await furnitureItemRepository.findById(shopItemId);
  if (!item || !item.isActive) throw new AppError("NOT_FOUND", "このアイテムはショップにありません。");
  if (item.requiredLeague && profile.totalPoints < item.requiredLeague.requiredPoints) throw new AppError("LEAGUE_LOCKED");

  const existing = await ownedFurnitureRepository.findOne(profile.id, shopItemId);
  if (existing && !item.stackable) throw new AppError("ALREADY_OWNED");
  if (profile.prizeCurrency < item.price) throw new AppError("INSUFFICIENT_FUNDS");

  try {
    await prisma.$transaction(async (tx) => {
      const debited = await tx.playerProfile.updateMany({
        where: { id: profile.id, prizeCurrency: { gte: item.price } },
        data: { prizeCurrency: { decrement: item.price } },
      });
      if (debited.count === 0) throw new AppError("INSUFFICIENT_FUNDS");

      if (existing) {
        await ownedFurnitureRepository.incrementQuantity(tx, existing.id);
      } else {
        await ownedFurnitureRepository.create(tx, profile.id, shopItemId);
      }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Non-stackable double-purchase race: @@unique([playerProfileId, shopItemId]) rolls the
    // whole transaction (including the debit) back — surface the same friendly error a
    // non-racing caller would have gotten from the upfront check above.
    throw new AppError("ALREADY_OWNED");
  }

  return { purchased: true, itemId: shopItemId };
}

export async function listOwnedFurniture(userId: string) {
  const profile = await requireProfile(userId);
  const owned = await ownedFurnitureRepository.listForPlayer(profile.id);
  return owned.map((o) => ({
    id: o.id,
    shopItemId: o.shopItemId,
    name: o.shopItem.name,
    category: o.shopItem.category,
    rarity: o.shopItem.rarity,
    width: o.shopItem.width,
    height: o.shopItem.height,
    colorKey: o.shopItem.colorKey,
    quantity: o.quantity,
  }));
}
