import type { BotPlayer } from "@/domain/interfaces/psychological-game";

/**
 * Shared "does this bot slip up" roll. bot.randomness (0-100) scales the mistake probability;
 * even a MASTER-band bot (low randomness) still has a small chance to deviate, so no bot ever
 * becomes a perfectly unbeatable opponent (source spec §10).
 */
export function rollMistakeProbability(bot: BotPlayer): number {
  return (bot.randomness / 100) * 0.5;
}

export function maybeFlip<T>(optimal: T, alternative: T, bot: BotPlayer, random: () => number): T {
  return random() < rollMistakeProbability(bot) ? alternative : optimal;
}

export function pickWeighted<T>(options: { value: T; weight: number }[], random: () => number): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option.value;
  }
  return options[options.length - 1].value;
}
