-- CreateEnum
CREATE TYPE "RoomFurnitureCategory" AS ENUM ('DESK', 'CHAIR', 'BED', 'SOFA', 'TABLE', 'STORAGE', 'LIGHTING', 'WALL_ART', 'RUG', 'PLANT', 'GAMING', 'TROPHY', 'LUXURY', 'LEAGUE_EXCLUSIVE');

-- CreateEnum
CREATE TYPE "RoomFurnitureRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "upgradePrice" INTEGER NOT NULL,
    "requiredLeagueId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rooms" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upgradedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_furniture_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RoomFurnitureCategory" NOT NULL,
    "rarity" "RoomFurnitureRarity" NOT NULL DEFAULT 'COMMON',
    "price" INTEGER NOT NULL,
    "requiredLeagueId" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "colorKey" TEXT NOT NULL,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_furniture_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_owned_furniture" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "shopItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_owned_furniture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_furniture_placements" (
    "id" TEXT NOT NULL,
    "userRoomId" TEXT NOT NULL,
    "ownedFurnitureId" TEXT NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_furniture_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_types_code_key" ON "room_types"("code");

-- CreateIndex
CREATE INDEX "room_types_sortOrder_idx" ON "room_types"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "user_rooms_playerProfileId_key" ON "user_rooms"("playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_furniture_items_code_key" ON "shop_furniture_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_owned_furniture_playerProfileId_shopItemId_key" ON "user_owned_furniture"("playerProfileId", "shopItemId");

-- CreateIndex
CREATE INDEX "room_furniture_placements_userRoomId_idx" ON "room_furniture_placements"("userRoomId");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_requiredLeagueId_fkey" FOREIGN KEY ("requiredLeagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rooms" ADD CONSTRAINT "user_rooms_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rooms" ADD CONSTRAINT "user_rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_furniture_items" ADD CONSTRAINT "shop_furniture_items_requiredLeagueId_fkey" FOREIGN KEY ("requiredLeagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_owned_furniture" ADD CONSTRAINT "user_owned_furniture_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_owned_furniture" ADD CONSTRAINT "user_owned_furniture_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "shop_furniture_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_furniture_placements" ADD CONSTRAINT "room_furniture_placements_userRoomId_fkey" FOREIGN KEY ("userRoomId") REFERENCES "user_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_furniture_placements" ADD CONSTRAINT "room_furniture_placements_ownedFurnitureId_fkey" FOREIGN KEY ("ownedFurnitureId") REFERENCES "user_owned_furniture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
