import { cosmeticPurchaseRepository } from "@/infrastructure/repositories/cosmetic-purchase.repository";
import { TITLES } from "@/config/titles";

/** Titles bought in the shop (CosmeticCategory.TITLE, matched by CosmeticItem.code === TitleConfig.code)
 * count as unlocked alongside the achievement-based rules in domain/services/title-unlock.service.ts.
 * Shared so the profile screen's display and the cosmetics-update validation agree on ownership. */
export async function getPurchasedTitleIds(playerProfileId: string): Promise<Set<string>> {
  const purchases = await cosmeticPurchaseRepository.listForPlayer(playerProfileId);
  const purchasedCodes = new Set(
    purchases.filter((p) => p.cosmeticItem.category === "TITLE").map((p) => p.cosmeticItem.code),
  );
  return new Set(TITLES.filter((t) => purchasedCodes.has(t.code)).map((t) => t.id));
}
