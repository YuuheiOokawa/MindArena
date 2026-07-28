import { z } from "zod";

export const purchaseFurnitureItemSchema = z.object({
  itemId: z.string().min(1),
});
export type PurchaseFurnitureItemInput = z.infer<typeof purchaseFurnitureItemSchema>;

const placementSchema = z.object({
  ownedFurnitureId: z.string().min(1),
  positionX: z.number().int().min(0),
  positionY: z.number().int().min(0),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
});

export const saveRoomLayoutSchema = z.object({
  placements: z.array(placementSchema).max(50),
});
export type SaveRoomLayoutInput = z.infer<typeof saveRoomLayoutSchema>;

export const removePlacementSchema = z.object({
  placementId: z.string().min(1),
});
export type RemovePlacementInput = z.infer<typeof removePlacementSchema>;
