import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { getMyRoom, getRoomTypeCatalog, purchaseRoom, upgradeRoom } from "@/features/rooms/room.service";
import { getFurnitureCatalog, purchaseFurnitureItem, listOwnedFurniture } from "@/features/shop/furniture.service";
import { getRoomPlacements, saveRoomLayout, removePlacement } from "@/features/rooms/placement.service";
import { AppError } from "@/lib/errors/app-error";

/**
 * Integration coverage for the マイルーム (room + furniture) feature: purchasing/upgrading a
 * room, buying furniture from the shop, and placing it — all against a real Postgres instance.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `room_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string, prizeCurrency = 0, totalPoints = 0) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  await prisma.playerProfile.update({ where: { id: profile.id }, data: { prizeCurrency, totalPoints } });
  return { userId: user.id, profileId: profile.id };
}

beforeAll(async () => {
  const roomTypeCount = await prisma.roomType.count();
  const furnitureCount = await prisma.shopFurnitureItem.count();
  if (roomTypeCount === 0 || furnitureCount === 0) {
    throw new Error("Room types / furniture not seeded — run `npm run db:seed` before the integration suite.");
  }
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.roomFurniturePlacement.deleteMany({ where: { userRoom: { playerProfileId: profile.id } } });
      await prisma.userRoom.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.userOwnedFurniture.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("room purchase and upgrade", () => {
  it("a fresh user has no room yet", async () => {
    const user = await makeUser("fresh");
    expect(await getMyRoom(user.userId)).toBeNull();
  });

  it("lists all 4 room types with league/ownership status", async () => {
    const user = await makeUser("catalog");
    const catalog = await getRoomTypeCatalog(user.userId);
    expect(catalog.map((r) => r.code).sort()).toEqual(["LARGE", "MEDIUM", "SMALL", "SUITE"].sort());
    const small = catalog.find((r) => r.code === "SMALL")!;
    expect(small.leagueUnlocked).toBe(true); // BRONZE requires 0 points
  });

  it("cannot buy a room with insufficient prizeCurrency", async () => {
    const user = await makeUser("poor", 0);
    await expect(purchaseRoom(user.userId)).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
  });

  it("cannot buy a room without the required league", async () => {
    // SMALL requires only BRONZE (0 pts), so a fresh 0-point user can buy it fine — the real
    // "league locked" path is upgrading into a higher-gated size (MEDIUM requires SILVER).
    const mediumRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "MEDIUM" } });
    const user = await makeUser("lowleague", 100000, 0);
    await purchaseRoom(user.userId);
    await prisma.playerProfile.update({ where: { id: user.profileId }, data: { prizeCurrency: mediumRoom.upgradePrice + 1000, totalPoints: 0 } });
    await expect(upgradeRoom(user.userId)).rejects.toMatchObject({ code: "LEAGUE_LOCKED" });
  });

  it("buys the SMALL room, then upgrades to MEDIUM without losing placed furniture, then cannot skip to SUITE", async () => {
    const smallRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "SMALL" } });
    const mediumRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "MEDIUM" }, include: { requiredLeague: true } });
    const user = await makeUser("upgrader", smallRoom.purchasePrice + mediumRoom.upgradePrice + 5000, mediumRoom.requiredLeague.requiredPoints + 100);

    const bought = await purchaseRoom(user.userId);
    expect(bought.roomTypeCode).toBe("SMALL");

    const furnitureItem = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: null } });
    await prisma.playerProfile.update({ where: { id: user.profileId }, data: { prizeCurrency: { increment: furnitureItem.price } } });
    await purchaseFurnitureItem(user.userId, furnitureItem.id);
    const owned = await listOwnedFurniture(user.userId);
    await saveRoomLayout(user.userId, [{ ownedFurnitureId: owned[0].id, positionX: 0, positionY: 0, rotation: 0 }]);

    const upgraded = await upgradeRoom(user.userId);
    expect(upgraded.roomTypeCode).toBe("MEDIUM");

    const roomAfter = await getMyRoom(user.userId);
    expect(roomAfter!.roomType.code).toBe("MEDIUM");
    expect(roomAfter!.placementCount).toBe(1); // furniture survived the upgrade

    // Room type sequencing is derived server-side from the CURRENT room, never a client target —
    // repeatedly calling upgrade always advances exactly one size, so "skipping" to SUITE is
    // structurally impossible; this call lands on LARGE, not SUITE.
    const largeRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "LARGE" }, include: { requiredLeague: true } });
    await prisma.playerProfile.update({ where: { id: user.profileId }, data: { prizeCurrency: { increment: largeRoom.upgradePrice + 1000 }, totalPoints: largeRoom.requiredLeague.requiredPoints + 100 } });
    const secondUpgrade = await upgradeRoom(user.userId);
    expect(secondUpgrade.roomTypeCode).toBe("LARGE");
  });

  it("cannot upgrade past the max size (SUITE)", async () => {
    const suiteRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "SUITE" }, include: { requiredLeague: true } });
    const user = await makeUser("maxed", 999_999, suiteRoom.requiredLeague.requiredPoints + 1000);
    await purchaseRoom(user.userId);

    // Fast-forward straight to SUITE by upgrading 3 times (SMALL -> MEDIUM -> LARGE -> SUITE).
    await upgradeRoom(user.userId);
    await upgradeRoom(user.userId);
    await upgradeRoom(user.userId);

    const room = await getMyRoom(user.userId);
    expect(room!.roomType.code).toBe("SUITE");
    expect(room!.nextUpgrade).toBeNull();

    await expect(upgradeRoom(user.userId)).rejects.toMatchObject({ code: "ALREADY_MAX_SIZE" });
  });
});

describe("furniture shop", () => {
  it("lists the furniture catalog with league/ownership/afford status", async () => {
    const user = await makeUser("shopcatalog", 100000, 100000);
    const catalog = await getFurnitureCatalog(user.userId);
    expect(catalog.items.length).toBeGreaterThanOrEqual(30);
    expect(catalog.items.every((i) => typeof i.canPurchase === "boolean")).toBe(true);
  });

  it("purchasing an item deducts the exact price from prizeCurrency", async () => {
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: null } });
    const user = await makeUser("buyer", item.price + 500);
    await purchaseFurnitureItem(user.userId, item.id);
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: user.profileId } });
    expect(profile.prizeCurrency).toBe(500);
  });

  it("prevents buying a non-stackable item twice", async () => {
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: null, stackable: false } });
    const user = await makeUser("doublebuy", item.price * 3);
    await purchaseFurnitureItem(user.userId, item.id);
    await expect(purchaseFurnitureItem(user.userId, item.id)).rejects.toMatchObject({ code: "ALREADY_OWNED" });
  });

  it("prevents two concurrent purchases of the same non-stackable item from both succeeding", async () => {
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: null, stackable: false } });
    const user = await makeUser("racebuy", item.price * 3);
    const results = await Promise.allSettled([purchaseFurnitureItem(user.userId, item.id), purchaseFurnitureItem(user.userId, item.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const owned = await prisma.userOwnedFurniture.findMany({ where: { playerProfileId: user.profileId, shopItemId: item.id } });
    expect(owned).toHaveLength(1);
  });

  it("allows a stackable item to be bought more than once, incrementing quantity", async () => {
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, stackable: true } });
    const user = await makeUser("stacker", item.price * 5);
    await purchaseFurnitureItem(user.userId, item.id);
    await purchaseFurnitureItem(user.userId, item.id);
    const owned = await prisma.userOwnedFurniture.findUniqueOrThrow({ where: { playerProfileId_shopItemId: { playerProfileId: user.profileId, shopItemId: item.id } } });
    expect(owned.quantity).toBe(2);
  });

  it("rejects purchase of a league-gated item below the required league", async () => {
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: { not: null } }, include: { requiredLeague: true } });
    const user = await makeUser("lowleague2", item.price + 1000, 0);
    await expect(purchaseFurnitureItem(user.userId, item.id)).rejects.toMatchObject({ code: "LEAGUE_LOCKED" });
  });
});

describe("furniture placement", () => {
  async function setupRoomWithFunds(name: string, extraFurniturePrice = 0) {
    const smallRoom = await prisma.roomType.findUniqueOrThrow({ where: { code: "SMALL" } });
    const user = await makeUser(name, smallRoom.purchasePrice + extraFurniturePrice + 5000);
    await purchaseRoom(user.userId);
    return user;
  }

  it("places owned furniture and it's retrievable afterward (survives a fresh read)", async () => {
    const user = await setupRoomWithFunds("placer");
    const item = await prisma.shopFurnitureItem.findFirstOrThrow({ where: { isActive: true, requiredLeagueId: null, width: 1, height: 1 } });
    await purchaseFurnitureItem(user.userId, item.id);
    const owned = await listOwnedFurniture(user.userId);

    await saveRoomLayout(user.userId, [{ ownedFurnitureId: owned[0].id, positionX: 1, positionY: 1, rotation: 0 }]);

    const placements = await getRoomPlacements(user.userId);
    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({ positionX: 1, positionY: 1, rotation: 0 });
  });

  it("rejects placing furniture the player does not own", async () => {
    const user = await setupRoomWithFunds("nofurniture");
    await expect(saveRoomLayout(user.userId, [{ ownedFurnitureId: "not-a-real-id", positionX: 0, positionY: 0, rotation: 0 }])).rejects.toMatchObject({
      code: "ITEM_NOT_OWNED",
    });
  });

  it("rejects a layout that exceeds the room's capacity (SMALL = 4)", async () => {
    const user = await setupRoomWithFunds("overcap", 5000);
    const items = await prisma.shopFurnitureItem.findMany({ where: { isActive: true, requiredLeagueId: null, width: 1, height: 1 }, take: 5 });
    expect(items.length).toBeGreaterThanOrEqual(5);
    for (const item of items) await purchaseFurnitureItem(user.userId, item.id);
    const owned = await listOwnedFurniture(user.userId);

    const placements = owned.slice(0, 5).map((o, i) => ({ ownedFurnitureId: o.id, positionX: i, positionY: 0, rotation: 0 as const }));
    await expect(saveRoomLayout(user.userId, placements)).rejects.toMatchObject({ code: "OVER_CAPACITY" });
  });

  it("rejects two pieces of furniture placed on the same grid cell", async () => {
    const user = await setupRoomWithFunds("overlap", 2000);
    const items = await prisma.shopFurnitureItem.findMany({ where: { isActive: true, requiredLeagueId: null, width: 1, height: 1 }, take: 2 });
    for (const item of items) await purchaseFurnitureItem(user.userId, item.id);
    const owned = await listOwnedFurniture(user.userId);

    await expect(
      saveRoomLayout(user.userId, [
        { ownedFurnitureId: owned[0].id, positionX: 0, positionY: 0, rotation: 0 },
        { ownedFurnitureId: owned[1].id, positionX: 0, positionY: 0, rotation: 0 },
      ]),
    ).rejects.toMatchObject({ code: "PLACEMENT_OVERLAP" });
  });

  it("removes a single placed item without affecting the rest of the layout", async () => {
    const user = await setupRoomWithFunds("remover", 2000);
    const items = await prisma.shopFurnitureItem.findMany({ where: { isActive: true, requiredLeagueId: null, width: 1, height: 1 }, take: 2 });
    for (const item of items) await purchaseFurnitureItem(user.userId, item.id);
    const owned = await listOwnedFurniture(user.userId);
    await saveRoomLayout(user.userId, [
      { ownedFurnitureId: owned[0].id, positionX: 0, positionY: 0, rotation: 0 },
      { ownedFurnitureId: owned[1].id, positionX: 1, positionY: 0, rotation: 0 },
    ]);

    const beforeRemoval = await getRoomPlacements(user.userId);
    await removePlacement(user.userId, beforeRemoval[0].id);

    const afterRemoval = await getRoomPlacements(user.userId);
    expect(afterRemoval).toHaveLength(1);
    expect(afterRemoval[0].id).toBe(beforeRemoval[1].id);
  });

  it("throws NOT_FOUND when saving a layout for a user with no room", async () => {
    const user = await makeUser("noroom");
    await expect(saveRoomLayout(user.userId, [])).rejects.toBeInstanceOf(AppError);
  });
});
