-- DropForeignKey
ALTER TABLE "game_actions" DROP CONSTRAINT "game_actions_participantId_fkey";

-- AddForeignKey
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
