import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type {
  MinorityChoiceAction,
  MinorityChoiceChooseAction,
  MinorityChoiceDeclareAction,
  MinorityChoiceOption,
  MinorityChoiceState,
} from "@/features/games/minority-choice/types";
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

/** How often the bot's live declaration diverges from its actual intended pick — the bluff. */
function bluffRateFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.BETRAYER:
      return 0.6;
    case BotPersonality.AGGRESSIVE:
      return 0.45;
    case BotPersonality.ANALYST:
      return 0.35;
    case BotPersonality.PATTERN:
      return 0.2;
    case BotPersonality.CAUTIOUS:
      return 0.15;
    case BotPersonality.RANDOM:
    default:
      return 0.3;
  }
}

function declare(state: MinorityChoiceState, bot: BotPlayer, random: () => number): MinorityChoiceDeclareAction {
  const intent = byPersonality(state, bot, random);
  const alternative: MinorityChoiceOption = intent === "A" ? "B" : "A";
  const declared = random() < bluffRateFor(bot) ? alternative : intent;

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "DECLARE",
    actionData: { choice: declared },
    submittedAt: Date.now(),
  };
}

function choose(state: MinorityChoiceState, bot: BotPlayer, random: () => number): MinorityChoiceChooseAction {
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

export function minorityChoiceBotStrategy(
  state: MinorityChoiceState,
  bot: BotPlayer,
  random: () => number,
): MinorityChoiceAction {
  return state.phase === "DECLARE" ? declare(state, bot, random) : choose(state, bot, random);
}
