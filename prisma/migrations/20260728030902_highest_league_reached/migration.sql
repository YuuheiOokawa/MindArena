-- AlterTable
ALTER TABLE "player_profiles" ADD COLUMN     "highestLeagueAt" TIMESTAMP(3),
ADD COLUMN     "highestLeagueId" TEXT;

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_highestLeagueId_fkey" FOREIGN KEY ("highestLeagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
