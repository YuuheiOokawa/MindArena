import type { GameState, PlayerAction, PsychologicalGame } from "@/domain/interfaces/psychological-game";
import { trustOrBetrayGame } from "@/features/games/trust-or-betray";
import { numberBluffGame } from "@/features/games/number-bluff";
import { minorityChoiceGame } from "@/features/games/minority-choice";
import { finalPredictionGame } from "@/features/games/final-prediction";

/**
 * The one place the tournament/session/bot layers look up a game implementation by id.
 * Adding game #5 means implementing PsychologicalGame and adding one line here — nothing
 * else in the codebase branches on a specific game id (see docs/08_GAME_ENGINE_DESIGN.md).
 */
export const GAME_REGISTRY: Record<string, PsychologicalGame<GameState, PlayerAction>> = {
  [trustOrBetrayGame.id]: trustOrBetrayGame as PsychologicalGame<GameState, PlayerAction>,
  [numberBluffGame.id]: numberBluffGame as PsychologicalGame<GameState, PlayerAction>,
  [minorityChoiceGame.id]: minorityChoiceGame as PsychologicalGame<GameState, PlayerAction>,
  [finalPredictionGame.id]: finalPredictionGame as PsychologicalGame<GameState, PlayerAction>,
};

export function getGame(gameId: string): PsychologicalGame<GameState, PlayerAction> {
  const game = GAME_REGISTRY[gameId];
  if (!game) throw new Error(`Unknown game id: ${gameId}`);
  return game;
}
