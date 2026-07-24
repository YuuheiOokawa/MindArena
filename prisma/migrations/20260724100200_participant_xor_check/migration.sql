-- A tournament participant is either a human player or a BOT, never both/neither.
ALTER TABLE "tournament_participants"
  ADD CONSTRAINT "participant_xor_player_or_bot"
  CHECK (("playerId" IS NOT NULL) <> ("botId" IS NOT NULL));
