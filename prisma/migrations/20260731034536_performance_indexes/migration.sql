-- CreateIndex
CREATE INDEX "player_profiles_currentLeagueId_totalPoints_idx" ON "player_profiles"("currentLeagueId", "totalPoints");

-- CreateIndex
CREATE INDEX "tournament_matches_player1ParticipantId_idx" ON "tournament_matches"("player1ParticipantId");

-- CreateIndex
CREATE INDEX "tournament_matches_player2ParticipantId_idx" ON "tournament_matches"("player2ParticipantId");

-- CreateIndex
CREATE INDEX "tournament_participants_playerId_idx" ON "tournament_participants"("playerId");
