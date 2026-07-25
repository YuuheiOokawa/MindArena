import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type {
  TrustOrBetrayAction,
  TrustOrBetrayChoice,
  TrustOrBetrayChooseAction,
  TrustOrBetrayDeclareAction,
  TrustOrBetrayState,
} from "@/features/games/trust-or-betray/types";
import { maybeFlip } from "@/features/bots/mistake";

function opponentId(state: TrustOrBetrayState, botParticipantId: string): string {
  return state.participantIds.find((id) => id !== botParticipantId)!;
}

function opponentBetrayalRate(state: TrustOrBetrayState, opponent: string): number {
  const opponentActions = state.history
    .map((record) => record.actions[opponent])
    .filter((action): action is TrustOrBetrayChooseAction => Boolean(action));
  if (opponentActions.length === 0) return 0.5;
  const betrayals = opponentActions.filter((action) => action.actionData.choice === "BETRAY").length;
  return betrayals / opponentActions.length;
}

function byPersonality(state: TrustOrBetrayState, bot: BotPlayer, random: () => number): TrustOrBetrayChoice {
  const opponent = opponentId(state, bot.participantId);

  switch (bot.personality) {
    case BotPersonality.CAUTIOUS:
      return random() < 0.2 + bot.riskTolerance / 400 ? "BETRAY" : "TRUST";
    case BotPersonality.AGGRESSIVE:
      return random() < 0.65 + bot.riskTolerance / 400 ? "BETRAY" : "TRUST";
    case BotPersonality.BETRAYER:
      return random() < 0.8 ? "BETRAY" : "TRUST";
    case BotPersonality.PATTERN:
      return state.round % 2 === 1 ? "BETRAY" : "TRUST";
    case BotPersonality.ANALYST: {
      const rate = opponentBetrayalRate(state, opponent);
      return random() < 0.3 + rate * 0.5 ? "BETRAY" : "TRUST";
    }
    case BotPersonality.RANDOM:
    default:
      return random() < 0.5 ? "TRUST" : "BETRAY";
  }
}

/** How often the bot's live declaration diverges from its actual intended pick — the bluff. */
function bluffRateFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.BETRAYER:
      return 0.55;
    case BotPersonality.AGGRESSIVE:
      return 0.4;
    case BotPersonality.ANALYST:
      return 0.35;
    case BotPersonality.PATTERN:
      return 0.15;
    case BotPersonality.CAUTIOUS:
      return 0.2;
    case BotPersonality.RANDOM:
    default:
      return 0.3;
  }
}

function declare(state: TrustOrBetrayState, bot: BotPlayer, random: () => number): TrustOrBetrayDeclareAction {
  const intent = byPersonality(state, bot, random);
  const alternative: TrustOrBetrayChoice = intent === "TRUST" ? "BETRAY" : "TRUST";
  const declared = random() < bluffRateFor(bot) ? alternative : intent;

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "DECLARE",
    actionData: { choice: declared },
    submittedAt: Date.now(),
  };
}

function choose(state: TrustOrBetrayState, bot: BotPlayer, random: () => number): TrustOrBetrayChooseAction {
  const optimal = byPersonality(state, bot, random);
  const alternative: TrustOrBetrayChoice = optimal === "TRUST" ? "BETRAY" : "TRUST";
  const choice = maybeFlip(optimal, alternative, bot, random);

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "CHOOSE",
    actionData: { choice },
    submittedAt: Date.now(),
  };
}

export function trustOrBetrayBotStrategy(
  state: TrustOrBetrayState,
  bot: BotPlayer,
  random: () => number,
): TrustOrBetrayAction {
  return state.phase === "DECLARE" ? declare(state, bot, random) : choose(state, bot, random);
}
