-- AlterTable
ALTER TABLE "cosmetic_items" ADD COLUMN     "price" INTEGER;

-- AlterTable
ALTER TABLE "player_profiles" ADD COLUMN     "prizeCurrency" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "league_trophies" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstWonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWonAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_trophies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetic_purchases" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "cosmeticItemId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetic_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_trophies_playerProfileId_leagueId_key" ON "league_trophies"("playerProfileId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "cosmetic_purchases_playerProfileId_cosmeticItemId_key" ON "cosmetic_purchases"("playerProfileId", "cosmeticItemId");

-- AddForeignKey
ALTER TABLE "league_trophies" ADD CONSTRAINT "league_trophies_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_trophies" ADD CONSTRAINT "league_trophies_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosmetic_purchases" ADD CONSTRAINT "cosmetic_purchases_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosmetic_purchases" ADD CONSTRAINT "cosmetic_purchases_cosmeticItemId_fkey" FOREIGN KEY ("cosmeticItemId") REFERENCES "cosmetic_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
