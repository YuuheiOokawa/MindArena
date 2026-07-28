import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { userRoomRepository } from "@/infrastructure/repositories/user-room.repository";
import { ownedFurnitureRepository } from "@/infrastructure/repositories/owned-furniture.repository";
import { furniturePlacementRepository } from "@/infrastructure/repositories/furniture-placement.repository";
import { validateRoomLayout, type OwnedFurnitureInfo, type PlacementInput, type RoomLayoutError } from "@/domain/services/room-layout.service";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

const LAYOUT_ERROR_CODE: Record<RoomLayoutError, AppErrorCode> = {
  OVER_CAPACITY: "OVER_CAPACITY",
  INVALID_ROTATION: "VALIDATION_ERROR",
  UNKNOWN_FURNITURE: "ITEM_NOT_OWNED",
  OVER_OWNED_QUANTITY: "OVER_OWNED_QUANTITY",
  OUT_OF_BOUNDS: "OUT_OF_BOUNDS",
  OVERLAP: "PLACEMENT_OVERLAP",
};

export async function getRoomPlacements(userId: string) {
  const profile = await requireProfile(userId);
  const room = await userRoomRepository.findForPlayer(profile.id);
  if (!room) throw new AppError("NOT_FOUND", "部屋をまだ所有していません。");

  const placements = await furniturePlacementRepository.listForRoom(room.id);
  return placements.map((p) => ({
    id: p.id,
    ownedFurnitureId: p.ownedFurnitureId,
    shopItemId: p.ownedFurniture.shopItemId,
    name: p.ownedFurniture.shopItem.name,
    width: p.ownedFurniture.shopItem.width,
    height: p.ownedFurniture.shopItem.height,
    colorKey: p.ownedFurniture.shopItem.colorKey,
    positionX: p.positionX,
    positionY: p.positionY,
    rotation: p.rotation,
  }));
}

/** Replaces the player's ENTIRE room layout in one atomic, server-validated operation — the
 * natural shape of a mobile "select furniture → tap a cell → rotate → 保存" editing session
 * (see docs on the my-room screen), rather than one round trip per drag. Re-validates
 * capacity/ownership/quantity/bounds/overlap from scratch against the DB every time; never
 * trusts the client's own bookkeeping of what it's allowed to place. */
export async function saveRoomLayout(userId: string, placements: PlacementInput[]) {
  const profile = await requireProfile(userId);
  const room = await userRoomRepository.findForPlayer(profile.id);
  if (!room) throw new AppError("NOT_FOUND", "部屋をまだ所有していません。");

  const owned = await ownedFurnitureRepository.listForPlayer(profile.id);
  const ownedByPlayer = new Set(owned.map((o) => o.id));
  const ownedInfo = new Map<string, OwnedFurnitureInfo>(
    owned.map((o) => [o.id, { width: o.shopItem.width, height: o.shopItem.height, quantity: o.quantity }]),
  );

  // Ownership check happens here (not inside the pure validator) because it needs the DB read
  // above — validateRoomLayout only knows about the ownedItems map it's handed.
  for (const p of placements) {
    if (!ownedByPlayer.has(p.ownedFurnitureId)) throw new AppError("ITEM_NOT_OWNED");
  }

  const validation = validateRoomLayout({ width: room.roomType.width, height: room.roomType.height, capacity: room.roomType.capacity }, ownedInfo, placements);
  if (!validation.valid) {
    throw new AppError(LAYOUT_ERROR_CODE[validation.error!]);
  }

  await prisma.$transaction(async (tx) => {
    await furniturePlacementRepository.replaceAllForRoom(tx, room.id, placements);
  });

  return { saved: true, count: placements.length };
}

export async function removePlacement(userId: string, placementId: string) {
  const profile = await requireProfile(userId);
  const room = await userRoomRepository.findForPlayer(profile.id);
  if (!room) throw new AppError("NOT_FOUND", "部屋をまだ所有していません。");

  const result = await furniturePlacementRepository.deleteOne(room.id, placementId);
  if (result.count === 0) throw new AppError("NOT_FOUND", "この家具はすでに撤去されています。");
  return { removed: true };
}
