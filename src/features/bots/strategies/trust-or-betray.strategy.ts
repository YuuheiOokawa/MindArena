import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import type { TrustOrBetrayAction, TrustOrBetrayChoice, TrustOrBetrayState } from "@/features/games/trust-or-betray/types";
import { maybeFlip } from "@/features/bots/mistake";

function opponentId(state: TrustOrBetrayState, botParticipantId: string): string {
  return state.participantIds.find((id) => id !== botParticipantId)!;
}

function opponentBetrayalRate(state: TrustOrBetrayState, opponent: string): number {
  const opponentActions = state.history
    .map((record) => record.actions[opponent])
    .filter((action): action is TrustOrBetrayAction => Boolean(action));
  if (opponentActions.length === 0) return 0.5;
  const betrayals = opponentActions.filter((action) => action.actionData.choice === "BETRAY").length;
  return betrayals / opponentActions.length;
}

function buildAction(state: TrustOrBetrayState, bot: BotPlayer, choice: TrustOrBetrayChoice): TrustOrBetrayAction {
  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "CHOOSE",
    actionData: { choice },
    submittedAt: Date.now(),
  };
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

export function trustOrBetrayBotStrategy(
  state: TrustOrBetrayState,
  bot: BotPlayer,
  random: () => number,
): TrustOrBetrayAction {
  const optimal = byPersonality(state, bot, random);
  const alternative: TrustOrBetrayChoice = optimal === "TRUST" ? "BETRAY" : "TRUST";
  const choice = maybeFlip(optimal, alternative, bot, random);
  return buildAction(state, bot, choice);
}
