/** A single proposed furniture placement, as sent by the client when saving a room layout. */
export interface PlacementInput {
  ownedFurnitureId: string;
  positionX: number;
  positionY: number;
  /** Degrees — must be one of 0/90/180/270. */
  rotation: number;
}

export interface OwnedFurnitureInfo {
  width: number;
  height: number;
  /** How many copies of this item the player owns — at most this many placements may reference it. */
  quantity: number;
}

export interface RoomBounds {
  width: number;
  height: number;
  capacity: number;
}

export type RoomLayoutError =
  | "OVER_CAPACITY"
  | "INVALID_ROTATION"
  | "UNKNOWN_FURNITURE"
  | "OVER_OWNED_QUANTITY"
  | "OUT_OF_BOUNDS"
  | "OVERLAP";

export interface RoomLayoutValidation {
  valid: boolean;
  error?: RoomLayoutError;
  /** Index into `placements` the error was found at, when applicable. */
  index?: number;
}

/** Effective grid footprint after rotation — 90°/270° swap width and height. */
function footprint(width: number, height: number, rotation: number): { w: number; h: number } {
  return rotation === 90 || rotation === 270 ? { w: height, h: width } : { w: width, h: height };
}

/**
 * Pure validator for a full proposed room layout — used both when saving (features/rooms/
 * my-room.service.ts) and unit-tested directly. Checks capacity, ownership/quantity, rotation
 * validity, room bounds, and pairwise overlap. Returns the FIRST violation found rather than
 * collecting all of them — good enough for a save-time gate, not meant as a form-validation UX.
 */
export function validateRoomLayout(
  room: RoomBounds,
  ownedItems: ReadonlyMap<string, OwnedFurnitureInfo>,
  placements: PlacementInput[],
): RoomLayoutValidation {
  if (placements.length > room.capacity) return { valid: false, error: "OVER_CAPACITY" };

  const usageCount = new Map<string, number>();
  const occupied = new Map<string, number>(); // "x,y" -> placement index that claimed it

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    if (![0, 90, 180, 270].includes(p.rotation)) return { valid: false, error: "INVALID_ROTATION", index: i };

    const item = ownedItems.get(p.ownedFurnitureId);
    if (!item) return { valid: false, error: "UNKNOWN_FURNITURE", index: i };

    const usedSoFar = usageCount.get(p.ownedFurnitureId) ?? 0;
    if (usedSoFar + 1 > item.quantity) return { valid: false, error: "OVER_OWNED_QUANTITY", index: i };
    usageCount.set(p.ownedFurnitureId, usedSoFar + 1);

    const { w, h } = footprint(item.width, item.height, p.rotation);
    if (p.positionX < 0 || p.positionY < 0 || p.positionX + w > room.width || p.positionY + h > room.height) {
      return { valid: false, error: "OUT_OF_BOUNDS", index: i };
    }

    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const key = `${p.positionX + dx},${p.positionY + dy}`;
        if (occupied.has(key)) return { valid: false, error: "OVERLAP", index: i };
        occupied.set(key, i);
      }
    }
  }

  return { valid: true };
}
