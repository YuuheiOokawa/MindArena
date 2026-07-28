-- AlterTable
ALTER TABLE "player_profiles" ADD COLUMN     "dailyMatchesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyMissionDate" TEXT,
ADD COLUMN     "dailyWins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "daily_mission_claims" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "missionCode" TEXT NOT NULL,
    "claimedForDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_mission_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_mission_claims_playerProfileId_missionCode_claimedFor_key" ON "daily_mission_claims"("playerProfileId", "missionCode", "claimedForDate");

-- AddForeignKey
ALTER TABLE "daily_mission_claims" ADD CONSTRAINT "daily_mission_claims_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
