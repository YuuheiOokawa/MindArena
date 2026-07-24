import { z } from "zod";

export const purchaseShopItemSchema = z.object({
  itemId: z.string().min(1),
});

export type PurchaseShopItemInput = z.infer<typeof purchaseShopItemSchema>;

export const equipShopCosmeticSchema = z.object({
  category: z.enum(["BACKGROUND", "BADGE"]),
  itemId: z.string().min(1).nullable(),
});

export type EquipShopCosmeticInput = z.infer<typeof equipShopCosmeticSchema>;
