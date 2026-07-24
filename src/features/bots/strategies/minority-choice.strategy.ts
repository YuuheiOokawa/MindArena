import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type { MinorityChoiceAction, MinorityChoiceOption, MinorityChoiceState } from "@/features/games/minority-choice/types";
import { maybeFlip } from "@/features/bots/mistake";

function opponentLeanTowardA(state: MinorityChoiceState, opponentId: string): number {
  const opponentActions = state.history
    .map((record) => record.actions[opponentId])
    .filter((action): action is MinorityChoiceAction => Boolean(action));
  if (opponentActions.length === 0) return 0.5;
  const aCount = opponentActions.filter((action) => action.actionData.choice === "A").length;
  return aCount / opponentActions.length;
}

function byPersonality(state: MinorityChoiceState, bot: BotPlayer, random: () => number): MinorityChoiceOption {
  switch (bot.personality) {
    case BotPersonality.ANALYST: {
      const opponentId = state.participantIds.find((id) => id !== bot.participantId)!;
      const lean = opponentLeanTowardA(state, opponentId);
      // Predict the opponent leans toward whichever side they favored historically, so pick the other.
      return lean >= 0.5 ? "B" : "A";
    }
    case BotPersonality.PATTERN:
      return state.round % 2 === 1 ? "A" : "B";
    case BotPersonality.CAUTIOUS:
      return random() < 0.5 ? "A" : "B";
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      // Leans toward whichever side had fewer picks in the crowd data available so far this round.
      return random() < 0.5 + bot.riskTolerance / 500 ? "B" : "A";
    case BotPersonality.RANDOM:
    default:
      return random() < 0.5 ? "A" : "B";
  }
}

export function minorityChoiceBotStrategy(
  state: MinorityChoiceState,
  bot: BotPlayer,
  random: () => number,
): MinorityChoiceAction {
  const optimal = byPersonality(state, bot, random);
  const alternative: MinorityChoiceOption = optimal === "A" ? "B" : "A";
  const choice = maybeFlip(optimal, alternative, bot, random);

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "CHOOSE",
    actionData: { choice },
    submittedAt: Date.now(),
  };
}
