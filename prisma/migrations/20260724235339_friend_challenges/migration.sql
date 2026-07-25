-- CreateEnum
CREATE TYPE "FriendChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "friend_challenges" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "status" "FriendChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "tournamentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friend_challenges_tournamentId_key" ON "friend_challenges"("tournamentId");

-- CreateIndex
CREATE INDEX "friend_challenges_opponentId_status_idx" ON "friend_challenges"("opponentId", "status");

-- CreateIndex
CREATE INDEX "friend_challenges_challengerId_status_idx" ON "friend_challenges"("challengerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friend_challenges_challengerId_opponentId_key" ON "friend_challenges"("challengerId", "opponentId");

-- AddForeignKey
ALTER TABLE "friend_challenges" ADD CONSTRAINT "friend_challenges_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_challenges" ADD CONSTRAINT "friend_challenges_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_challenges" ADD CONSTRAINT "friend_challenges_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A player cannot challenge themselves.
ALTER TABLE "friend_challenges"
  ADD CONSTRAINT "friend_challenge_not_self"
  CHECK ("challengerId" <> "opponentId");
