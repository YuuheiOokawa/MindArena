import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { roomTypeRepository } from "@/infrastructure/repositories/room-type.repository";
import { userRoomRepository } from "@/infrastructure/repositories/user-room.repository";
import { AppError } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

/** Catalog of all 4 room sizes with unlock/ownership status for the room-purchase screen. */
export async function getRoomTypeCatalog(userId: string) {
  const profile = await requireProfile(userId);
  const [roomTypes, myRoom] = await Promise.all([roomTypeRepository.findAllActive(), userRoomRepository.findForPlayer(profile.id)]);

  return roomTypes.map((roomType) => ({
    id: roomType.id,
    code: roomType.code,
    name: roomType.name,
    capacity: roomType.capacity,
    purchasePrice: roomType.purchasePrice,
    upgradePrice: roomType.upgradePrice,
    width: roomType.width,
    height: roomType.height,
    sortOrder: roomType.sortOrder,
    requiredLeague: { id: roomType.requiredLeague.id, displayName: roomType.requiredLeague.displayName, themeKey: roomType.requiredLeague.themeKey },
    leagueUnlocked: profile.totalPoints >= roomType.requiredLeague.requiredPoints,
    isCurrent: myRoom?.roomTypeId === roomType.id,
    alreadyOwned: myRoom ? myRoom.roomType.sortOrder >= roomType.sortOrder : false,
  }));
}

/** null if the player has never bought a room yet — the room-purchase screen is shown instead of MyRoom. */
export async function getMyRoom(userId: string) {
  const profile = await requireProfile(userId);
  const room = await userRoomRepository.findForPlayer(profile.id);
  if (!room) return null;

  const allRoomTypes = await roomTypeRepository.findAllActive();
  const nextRoomType = allRoomTypes.find((r) => r.sortOrder === room.roomType.sortOrder + 1) ?? null;

  return {
    id: room.id,
    roomType: { id: room.roomType.id, code: room.roomType.code, name: room.roomType.name, width: room.roomType.width, height: room.roomType.height, capacity: room.roomType.capacity },
    purchasedAt: room.purchasedAt,
    upgradedAt: room.upgradedAt,
    placementCount: room.placements.length,
    prizeCurrency: profile.prizeCurrency,
    nextUpgrade: nextRoomType
      ? {
          id: nextRoomType.id,
          name: nextRoomType.name,
          capacity: nextRoomType.capacity,
          upgradePrice: nextRoomType.upgradePrice,
          leagueUnlocked: profile.totalPoints >= nextRoomType.requiredLeague.requiredPoints,
          requiredLeagueName: nextRoomType.requiredLeague.displayName,
        }
      : null,
  };
}

/** Buys the entry (SMALL) room — the only room a player can ever buy standalone; every size
 * after that is reached via upgradeRoom. Race-safe against a double-tap the same way
 * shop.service.ts's purchaseShopItem is: a conditional balance UPDATE, not a plain decrement. */
export async function purchaseRoom(userId: string) {
  const profile = await requireProfile(userId);

  const existing = await userRoomRepository.findForPlayer(profile.id);
  if (existing) throw new AppError("ALREADY_OWNED", "すでに部屋を所有しています。");

  const smallRoomType = await roomTypeRepository.findByCode("SMALL");
  if (!smallRoomType || !smallRoomType.isActive) throw new AppError("NOT_FOUND", "部屋タイプが見つかりません。");
  if (profile.totalPoints < smallRoomType.requiredLeague.requiredPoints) {
    throw new AppError("LEAGUE_LOCKED", "必要リーグに到達していません。");
  }
  if (profile.prizeCurrency < smallRoomType.purchasePrice) throw new AppError("INSUFFICIENT_FUNDS", "賞金が不足しています。");

  try {
    await prisma.$transaction(async (tx) => {
      const debited = await tx.playerProfile.updateMany({
        where: { id: profile.id, prizeCurrency: { gte: smallRoomType.purchasePrice } },
        data: { prizeCurrency: { decrement: smallRoomType.purchasePrice } },
      });
      if (debited.count === 0) throw new AppError("INSUFFICIENT_FUNDS", "賞金が不足しています。");
      await userRoomRepository.create(tx, profile.id, smallRoomType.id);
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    // @@unique([playerProfileId]) — a concurrent double-tap loses the debit's rollback race.
    throw new AppError("ALREADY_OWNED", "すでに部屋を所有しています。");
  }

  return { purchased: true, roomTypeCode: smallRoomType.code };
}

/** Upgrades the player's existing room into the next size — never lets a size be skipped
 * (always resolved from the CURRENT room's own sortOrder+1, not a client-supplied target). */
export async function upgradeRoom(userId: string) {
  const profile = await requireProfile(userId);

  const room = await userRoomRepository.findForPlayer(profile.id);
  if (!room) throw new AppError("NOT_FOUND", "部屋をまだ所有していません。");

  const allRoomTypes = await roomTypeRepository.findAllActive();
  const nextRoomType = allRoomTypes.find((r) => r.sortOrder === room.roomType.sortOrder + 1);
  if (!nextRoomType) throw new AppError("ALREADY_MAX_SIZE", "すでに最大サイズです。");
  if (profile.totalPoints < nextRoomType.requiredLeague.requiredPoints) throw new AppError("LEAGUE_LOCKED", "必要リーグに到達していません。");
  if (profile.prizeCurrency < nextRoomType.upgradePrice) throw new AppError("INSUFFICIENT_FUNDS", "賞金が不足しています。");

  await prisma.$transaction(async (tx) => {
    const debited = await tx.playerProfile.updateMany({
      where: { id: profile.id, prizeCurrency: { gte: nextRoomType.upgradePrice } },
      data: { prizeCurrency: { decrement: nextRoomType.upgradePrice } },
    });
    if (debited.count === 0) throw new AppError("INSUFFICIENT_FUNDS", "賞金が不足しています。");
    await userRoomRepository.upgrade(tx, room.id, nextRoomType.id);
  });

  return { upgraded: true, roomTypeCode: nextRoomType.code };
}
