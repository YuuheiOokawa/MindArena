import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type {
  FinalPredictionAction,
  FinalPredictionChooseAction,
  FinalPredictionDeclareAction,
  FinalPredictionMove,
  FinalPredictionState,
} from "@/features/games/final-prediction/types";
import { maybeFlip, pickWeighted } from "@/features/bots/mistake";

const MOVES: FinalPredictionMove[] = ["STRIKE", "GUARD", "READ"];
const COUNTERS: Record<FinalPredictionMove, FinalPredictionMove> = {
  READ: "STRIKE",
  GUARD: "READ",
  STRIKE: "GUARD",
};

function opponentMoveFrequency(state: FinalPredictionState, opponentId: string): Record<FinalPredictionMove, number> {
  const counts: Record<FinalPredictionMove, number> = { STRIKE: 0, GUARD: 0, READ: 0 };
  for (const record of state.history) {
    const action = record.actions[opponentId] as FinalPredictionChooseAction | undefined;
    if (action) counts[action.actionData.move] += 1;
  }
  return counts;
}

function predictOpponentMove(state: FinalPredictionState, bot: BotPlayer, opponentId: string, random: () => number): FinalPredictionMove {
  const frequency = opponentMoveFrequency(state, opponentId);
  const historyLength = state.history.length;

  if (historyLength === 0 || bot.observation < 20) {
    return MOVES[Math.floor(random() * MOVES.length)];
  }

  // Weight prediction by observed frequency, scaled by the bot's observation stat.
  const weightScale = bot.observation / 100;
  return pickWeighted(
    MOVES.map((move) => ({ value: move, weight: 1 + frequency[move] * weightScale })),
    random,
  );
}

function byPersonality(state: FinalPredictionState, bot: BotPlayer, random: () => number): FinalPredictionMove {
  const opponentId = state.participantIds.find((id) => id !== bot.participantId)!;

  switch (bot.personality) {
    case BotPersonality.PATTERN:
      return MOVES[state.round % MOVES.length];
    case BotPersonality.ANALYST: {
      const predicted = predictOpponentMove(state, bot, opponentId, random);
      return COUNTERS[predicted];
    }
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      return random() < 0.5 + bot.riskTolerance / 400 ? "STRIKE" : MOVES[Math.floor(random() * MOVES.length)];
    case BotPersonality.CAUTIOUS:
      return random() < 0.5 ? "GUARD" : MOVES[Math.floor(random() * MOVES.length)];
    case BotPersonality.RANDOM:
    default:
      return MOVES[Math.floor(random() * MOVES.length)];
  }
}

/** How often the bot's declaration is a decoy (a random OTHER move) instead of its honest read —
 * a truthful declaration of exactly what byPersonality would pick right now is easy to punish
 * once the opponent also reasons about it, so most personalities bluff more often than not. */
function bluffRateFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.PATTERN:
      return 0.3;
    case BotPersonality.CAUTIOUS:
      return 0.5;
    case BotPersonality.ANALYST:
      return 0.65;
    case BotPersonality.RANDOM:
    default:
      return 0.6;
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      return 0.7;
  }
}

/** How much the bot trusts the OPPONENT's declaration once it's visible, at the CHOOSE step —
 * trusting it means countering it directly; distrusting falls back to the normal history-read. */
function trustRateFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.CAUTIOUS:
    case BotPersonality.ANALYST:
      return 0.3;
    case BotPersonality.PATTERN:
      return 0.6;
    case BotPersonality.RANDOM:
    default:
      return 0.45;
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      return 0.4;
  }
}

function declare(state: FinalPredictionState, bot: BotPlayer, random: () => number): FinalPredictionDeclareAction {
  const intent = byPersonality(state, bot, random);
  const decoyPool = MOVES.filter((move) => move !== intent);
  const declared = random() < bluffRateFor(bot) ? decoyPool[Math.floor(random() * decoyPool.length)] : intent;

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "DECLARE",
    actionData: { move: declared },
    submittedAt: Date.now(),
  };
}

function choose(state: FinalPredictionState, bot: BotPlayer, random: () => number): FinalPredictionChooseAction {
  const opponentId = state.participantIds.find((id) => id !== bot.participantId)!;
  const opponentDeclared = state.declarations[opponentId]?.actionData.move;

  // Trust the opponent's declaration and directly counter it, or fall back to the normal
  // history-driven read — whether a bot falls for a declared bait is itself personality-driven.
  const optimal =
    opponentDeclared && random() < trustRateFor(bot) ? COUNTERS[opponentDeclared] : byPersonality(state, bot, random);
  const alternative = MOVES[(MOVES.indexOf(optimal) + 1) % MOVES.length];
  const move = maybeFlip(optimal, alternative, bot, random);

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "CHOOSE",
    actionData: { move },
    submittedAt: Date.now(),
  };
}

export function finalPredictionBotStrategy(
  state: FinalPredictionState,
  bot: BotPlayer,
  random: () => number,
): FinalPredictionAction {
  return state.phase === "DECLARE" ? declare(state, bot, random) : choose(state, bot, random);
}
