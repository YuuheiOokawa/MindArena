-- CreateEnum
CREATE TYPE "TournamentInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "player_profiles" ADD COLUMN     "customAvatarUrl" TEXT;

-- CreateTable
CREATE TABLE "tournament_invites" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "TournamentInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_invites_inviteeId_status_idx" ON "tournament_invites"("inviteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_invites_tournamentId_inviteeId_key" ON "tournament_invites"("tournamentId", "inviteeId");

-- AddForeignKey
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
