import { describe, expect, it } from "vitest";
import { validateRoomLayout, type OwnedFurnitureInfo, type PlacementInput, type RoomBounds } from "@/domain/services/room-layout.service";

const ROOM: RoomBounds = { width: 4, height: 4, capacity: 4 };

function owned(entries: Array<[string, OwnedFurnitureInfo]>): Map<string, OwnedFurnitureInfo> {
  return new Map(entries);
}

describe("validateRoomLayout", () => {
  it("accepts an empty layout", () => {
    expect(validateRoomLayout(ROOM, owned([]), [])).toEqual({ valid: true });
  });

  it("accepts a single item that fits", () => {
    const items = owned([["desk-1", { width: 2, height: 1, quantity: 1 }]]);
    const placements: PlacementInput[] = [{ ownedFurnitureId: "desk-1", positionX: 0, positionY: 0, rotation: 0 }];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: true });
  });

  it("rejects more placements than the room's capacity", () => {
    const items = owned([
      ["a", { width: 1, height: 1, quantity: 1 }],
      ["b", { width: 1, height: 1, quantity: 1 }],
      ["c", { width: 1, height: 1, quantity: 1 }],
      ["d", { width: 1, height: 1, quantity: 1 }],
      ["e", { width: 1, height: 1, quantity: 1 }],
    ]);
    const placements: PlacementInput[] = ["a", "b", "c", "d", "e"].map((id, i) => ({ ownedFurnitureId: id, positionX: i, positionY: 0, rotation: 0 }));
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: false, error: "OVER_CAPACITY" });
  });

  it("rejects an invalid rotation value", () => {
    const items = owned([["a", { width: 1, height: 1, quantity: 1 }]]);
    const placements: PlacementInput[] = [{ ownedFurnitureId: "a", positionX: 0, positionY: 0, rotation: 45 }];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: false, error: "INVALID_ROTATION", index: 0 });
  });

  it("rejects a placement referencing furniture the player doesn't own", () => {
    const placements: PlacementInput[] = [{ ownedFurnitureId: "ghost", positionX: 0, positionY: 0, rotation: 0 }];
    expect(validateRoomLayout(ROOM, owned([]), placements)).toEqual({ valid: false, error: "UNKNOWN_FURNITURE", index: 0 });
  });

  it("rejects placing more copies than owned (non-stackable item placed twice)", () => {
    const items = owned([["a", { width: 1, height: 1, quantity: 1 }]]);
    const placements: PlacementInput[] = [
      { ownedFurnitureId: "a", positionX: 0, positionY: 0, rotation: 0 },
      { ownedFurnitureId: "a", positionX: 1, positionY: 0, rotation: 0 },
    ];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: false, error: "OVER_OWNED_QUANTITY", index: 1 });
  });

  it("allows a stackable item to be placed up to its owned quantity", () => {
    const items = owned([["plant", { width: 1, height: 1, quantity: 2 }]]);
    const placements: PlacementInput[] = [
      { ownedFurnitureId: "plant", positionX: 0, positionY: 0, rotation: 0 },
      { ownedFurnitureId: "plant", positionX: 1, positionY: 0, rotation: 0 },
    ];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: true });
  });

  it("rejects a placement that falls outside the room bounds", () => {
    const items = owned([["a", { width: 2, height: 1, quantity: 1 }]]);
    const placements: PlacementInput[] = [{ ownedFurnitureId: "a", positionX: 3, positionY: 0, rotation: 0 }];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: false, error: "OUT_OF_BOUNDS", index: 0 });
  });

  it("accounts for rotation when checking bounds (90° swaps width/height)", () => {
    const items = owned([["a", { width: 3, height: 1, quantity: 1 }]]);
    // Un-rotated a 3x1 item at x=3 would overflow a width-4 room; rotated 90° it becomes 1x3
    // which fits fine at x=3.
    const rotated: PlacementInput[] = [{ ownedFurnitureId: "a", positionX: 3, positionY: 0, rotation: 90 }];
    expect(validateRoomLayout(ROOM, items, rotated)).toEqual({ valid: true });

    const unrotated: PlacementInput[] = [{ ownedFurnitureId: "a", positionX: 3, positionY: 0, rotation: 0 }];
    expect(validateRoomLayout(ROOM, items, unrotated)).toEqual({ valid: false, error: "OUT_OF_BOUNDS", index: 0 });
  });

  it("rejects two placements whose footprints overlap", () => {
    const items = owned([
      ["a", { width: 2, height: 2, quantity: 1 }],
      ["b", { width: 1, height: 1, quantity: 1 }],
    ]);
    const placements: PlacementInput[] = [
      { ownedFurnitureId: "a", positionX: 0, positionY: 0, rotation: 0 }, // occupies (0,0)-(1,1)
      { ownedFurnitureId: "b", positionX: 1, positionY: 1, rotation: 0 }, // overlaps at (1,1)
    ];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: false, error: "OVERLAP", index: 1 });
  });

  it("accepts two placements that are adjacent but not overlapping", () => {
    const items = owned([
      ["a", { width: 2, height: 2, quantity: 1 }],
      ["b", { width: 1, height: 1, quantity: 1 }],
    ]);
    const placements: PlacementInput[] = [
      { ownedFurnitureId: "a", positionX: 0, positionY: 0, rotation: 0 },
      { ownedFurnitureId: "b", positionX: 2, positionY: 0, rotation: 0 },
    ];
    expect(validateRoomLayout(ROOM, items, placements)).toEqual({ valid: true });
  });
});
