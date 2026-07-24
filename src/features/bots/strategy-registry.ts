import { BotPersonality } from "@/domain/enums";
import type { BotStrategy } from "@/domain/interfaces/bot-strategy";
import { trustOrBetrayBotStrategy } from "./strategies/trust-or-betray.strategy";
import { numberBluffBotStrategy } from "./strategies/number-bluff.strategy";
import { minorityChoiceBotStrategy } from "./strategies/minority-choice.strategy";
import { finalPredictionBotStrategy } from "./strategies/final-prediction.strategy";

/**
 * Every personality resolves to the SAME strategy function per game today (personality
 * branching happens inside each strategy function, keyed on bot.personality). The map is
 * still keyed by personality so a future personality can get a dedicated implementation
 * for a specific game without touching the others.
 */
function uniformForAllPersonalities(strategy: BotStrategy): Record<BotPersonality, BotStrategy> {
  return {
    [BotPersonality.RANDOM]: strategy,
    [BotPersonality.CAUTIOUS]: strategy,
    [BotPersonality.AGGRESSIVE]: strategy,
    [BotPersonality.BETRAYER]: strategy,
    [BotPersonality.PATTERN]: strategy,
    [BotPersonality.ANALYST]: strategy,
  };
}

export const BOT_STRATEGY_REGISTRY: Record<string, Record<BotPersonality, BotStrategy>> = {
  "trust-or-betray": uniformForAllPersonalities(trustOrBetrayBotStrategy as BotStrategy),
  "number-bluff": uniformForAllPersonalities(numberBluffBotStrategy as BotStrategy),
  "minority-choice": uniformForAllPersonalities(minorityChoiceBotStrategy as BotStrategy),
  "final-prediction": uniformForAllPersonalities(finalPredictionBotStrategy as BotStrategy),
};

export function resolveBotStrategy(gameId: string, personality: BotPersonality): BotStrategy {
  const forGame = BOT_STRATEGY_REGISTRY[gameId];
  if (!forGame) throw new Error(`No bot strategies registered for game ${gameId}`);
  const strategy = forGame[personality];
  if (!strategy) throw new Error(`No strategy for personality ${personality} in game ${gameId}`);
  return strategy;
}
