import type { BotPlayer, GameState, PlayerAction } from "@/domain/interfaces/psychological-game";

/**
 * A per-(game, personality) decision function. Games delegate createBotAction to the strategy
 * registry (features/bots/strategy-registry.ts) instead of hardcoding personality behavior
 * inline, so personalities and games can each evolve independently.
 */
export type BotStrategy<TState extends GameState = GameState, TAction extends PlayerAction = PlayerAction> = (
  state: TState,
  bot: BotPlayer,
  random: () => number,
) => TAction;
