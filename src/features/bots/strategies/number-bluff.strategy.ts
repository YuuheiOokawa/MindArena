import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import {
  NUMBER_BLUFF_DECLARATIONS,
  isDeclarationTrue,
  type NumberBluffDeclarationId,
} from "@/config/games/number-bluff";
import type {
  NumberBluffAction,
  NumberBluffDeclareAction,
  NumberBluffRespondAction,
  NumberBluffState,
} from "@/features/games/number-bluff/types";
import { maybeFlip } from "@/features/bots/mistake";

function pickNumber(random: () => number): number {
  return 1 + Math.floor(random() * 9);
}

function bluffRateFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.BETRAYER:
      return 0.75;
    case BotPersonality.AGGRESSIVE:
      return 0.6;
    case BotPersonality.CAUTIOUS:
      return 0.25;
    case BotPersonality.PATTERN:
      return 0.5;
    case BotPersonality.ANALYST:
      return 0.3 + bot.deception / 200;
    case BotPersonality.RANDOM:
    default:
      return 0.5;
  }
}

function chooseDeclaration(
  number: number,
  wantsToBluff: boolean,
  random: () => number,
): NumberBluffDeclarationId {
  const computable = NUMBER_BLUFF_DECLARATIONS.filter(
    (d) => d.id !== "greater-than-opponent",
  );
  const matching = computable.filter(
    (d) => isDeclarationTrue(d.id, number, number) === !wantsToBluff,
  );
  // isDeclarationTrue for "greater-than-opponent" needs an opponent number; computable ones don't.
  const pool = matching.length > 0 ? matching : computable;
  return pool[Math.floor(random() * pool.length)].id;
}

function declare(
  state: NumberBluffState,
  bot: BotPlayer,
  random: () => number,
): NumberBluffDeclareAction {
  const number = pickNumber(random);
  const wantsToBluff = random() < bluffRateFor(bot);
  const declarationId = chooseDeclaration(number, wantsToBluff, random);

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "DECLARE",
    actionData: { number, declarationId },
    submittedAt: Date.now(),
  };
}

function baseSuspicion(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.CAUTIOUS:
      return 0.55;
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      return 0.5;
    case BotPersonality.ANALYST:
      return 0.35 + bot.observation / 250;
    case BotPersonality.PATTERN:
      return 0.4;
    case BotPersonality.RANDOM:
    default:
      return 0.4;
  }
}

/**
 * Fraction of the opponent's PAST declarations this match that were actually lies (0.5 default).
 * Every history record retains both numbers, so even "私の数字は相手より大きい" is checkable in
 * hindsight — exactly the tally an attentive human keeps, which is why a player who lies every
 * round finds later bluffs stop landing against observant bots.
 */
function opponentLieRate(
  state: NumberBluffState,
  botId: string,
  opponentId: string,
): number {
  const observed = state.history.filter(
    (record) => record.actions[opponentId] && record.actions[botId],
  );
  if (observed.length === 0) return 0.5;
  const lies = observed.filter((record) => {
    const opp = (record.actions[opponentId] as NumberBluffDeclareAction)
      .actionData;
    const mine = (record.actions[botId] as NumberBluffDeclareAction).actionData;
    return !isDeclarationTrue(opp.declarationId, opp.number, mine.number);
  }).length;
  return lies / observed.length;
}

function respond(
  state: NumberBluffState,
  bot: BotPlayer,
  random: () => number,
): NumberBluffRespondAction {
  const opponentId = state.participantIds.find(
    (id) => id !== bot.participantId,
  )!;
  const opponentDeclaration = state.pendingDeclarations[opponentId];
  // Blend the personality's baseline doubt with the opponent's observed lie rate — the read
  // sharpens as rounds accumulate and as the bot's observation stat rises.
  const lieRate = opponentLieRate(state, bot.participantId, opponentId);
  const observationWeight =
    (state.history.length / 3) * (0.3 + bot.observation / 250);
  const suspicion = opponentDeclaration
    ? baseSuspicion(bot) * (1 - observationWeight) + lieRate * observationWeight
    : 0.4;
  const optimalBelieve = random() >= suspicion;
  const believe = maybeFlip(optimalBelieve, !optimalBelieve, bot, random);

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "RESPOND",
    actionData: { believe },
    submittedAt: Date.now(),
  };
}

export function numberBluffBotStrategy(
  state: NumberBluffState,
  bot: BotPlayer,
  random: () => number,
): NumberBluffAction {
  return state.phase === "DECLARE"
    ? declare(state, bot, random)
    : respond(state, bot, random);
}
