-- AlterEnum
ALTER TYPE "PointReason" ADD VALUE 'DAILY_BONUS';

-- AlterTable
ALTER TABLE "player_profiles" ADD COLUMN     "lastLoginBonusClaimedAt" TIMESTAMP(3),
ADD COLUMN     "loginBonusStreak" INTEGER NOT NULL DEFAULT 0;
