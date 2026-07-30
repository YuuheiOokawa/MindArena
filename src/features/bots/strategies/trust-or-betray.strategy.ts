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

function opponentId(
  state: TrustOrBetrayState,
  botParticipantId: string,
): string {
  return state.participantIds.find((id) => id !== botParticipantId)!;
}

function opponentBetrayalRate(
  state: TrustOrBetrayState,
  opponent: string,
): number {
  const opponentActions = state.history
    .map((record) => record.actions[opponent])
    .filter((action): action is TrustOrBetrayChooseAction => Boolean(action));
  if (opponentActions.length === 0) return 0.5;
  const betrayals = opponentActions.filter(
    (action) => action.actionData.choice === "BETRAY",
  ).length;
  return betrayals / opponentActions.length;
}

/** How often the opponent's declared choice matched their final pick in past rounds (0.5 default). */
function opponentDeclarationHonesty(
  state: TrustOrBetrayState,
  opponent: string,
): number {
  const observed = state.history.filter(
    (record) => record.declarations?.[opponent] && record.actions[opponent],
  );
  if (observed.length === 0) return 0.5;
  const honest = observed.filter(
    (record) =>
      record.declarations[opponent].actionData.choice ===
      (record.actions[opponent] as TrustOrBetrayAction).actionData.choice,
  ).length;
  return honest / observed.length;
}

/**
 * The bot's live estimate of P(opponent betrays this round), built from two real signals a human
 * player also has: the opponent's betrayal rate so far, and — once visible — their current
 * declaration weighted by how honest their past declarations proved to be. `observation` scales
 * how much the bot leans on the declaration read. This is what makes the player's declaration a
 * live weapon: an established honest pattern makes a late lie land, and vice versa.
 */
function estimateOpponentBetrayal(
  state: TrustOrBetrayState,
  bot: BotPlayer,
): number {
  const opponent = opponentId(state, bot.participantId);
  const base = opponentBetrayalRate(state, opponent);
  const declared = state.declarations[opponent]?.actionData.choice;
  if (!declared) return base;

  const honesty = opponentDeclarationHonesty(state, opponent);
  // If they're honest, the declaration is the truth; if they're a proven liar, invert it.
  const declarationSignal = declared === "BETRAY" ? honesty : 1 - honesty;
  const observationWeight = 0.3 + bot.observation / 250; // ~0.3 (oblivious) .. 0.7 (sharp reader)
  return base * (1 - observationWeight) + declarationSignal * observationWeight;
}

/**
 * Payoff table (scoring.ts): EV(trust) = 1 - p, EV(betray) = 2 - 3p for p = P(opponent betrays),
 * so betraying is optimal exactly when p < 0.5. Personalities shift that break-even threshold —
 * a cautious bot needs near-certainty of a trusting opponent before it risks the -1 crash, an
 * aggressive one betrays into all but the most obvious traps. PATTERN/RANDOM keep their
 * non-reactive tells so attentive players have exploitable opponents at the lower bands.
 */
function betrayThresholdFor(bot: BotPlayer): number {
  switch (bot.personality) {
    case BotPersonality.CAUTIOUS:
      return 0.3;
    case BotPersonality.ANALYST:
      return 0.5; // EV-optimal
    case BotPersonality.AGGRESSIVE:
      return 0.7;
    case BotPersonality.BETRAYER:
      return 0.85;
    default:
      return 0.5;
  }
}

function byPersonality(
  state: TrustOrBetrayState,
  bot: BotPlayer,
  random: () => number,
): TrustOrBetrayChoice {
  switch (bot.personality) {
    case BotPersonality.PATTERN:
      return state.round % 2 === 1 ? "BETRAY" : "TRUST";
    case BotPersonality.RANDOM:
      return random() < 0.5 ? "TRUST" : "BETRAY";
    default: {
      const p = estimateOpponentBetrayal(state, bot);
      return p < betrayThresholdFor(bot) ? "BETRAY" : "TRUST";
    }
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

function declare(
  state: TrustOrBetrayState,
  bot: BotPlayer,
  random: () => number,
): TrustOrBetrayDeclareAction {
  const intent = byPersonality(state, bot, random);
  const alternative: TrustOrBetrayChoice =
    intent === "TRUST" ? "BETRAY" : "TRUST";
  const declared = random() < bluffRateFor(bot) ? alternative : intent;

  return {
    participantId: bot.participantId,
    round: state.round,
    actionType: "DECLARE",
    actionData: { choice: declared },
    submittedAt: Date.now(),
  };
}

function choose(
  state: TrustOrBetrayState,
  bot: BotPlayer,
  random: () => number,
): TrustOrBetrayChooseAction {
  const optimal = byPersonality(state, bot, random);
  const alternative: TrustOrBetrayChoice =
    optimal === "TRUST" ? "BETRAY" : "TRUST";
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
  return state.phase === "DECLARE"
    ? declare(state, bot, random)
    : choose(state, bot, random);
}
