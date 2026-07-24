import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type {
  FinalPredictionAction,
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
    const action = record.actions[opponentId] as FinalPredictionAction | undefined;
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

export function finalPredictionBotStrategy(
  state: FinalPredictionState,
  bot: BotPlayer,
  random: () => number,
): FinalPredictionAction {
  const optimal = byPersonality(state, bot, random);
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
