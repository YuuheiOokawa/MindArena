import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import {
  crowdPreview,
  simulateCrowd,
} from "@/features/games/minority-choice/scoring";
import type {
  CrowdPreview,
  MinorityChoiceAction,
  MinorityChoiceChooseAction,
  MinorityChoiceDeclareAction,
  MinorityChoiceOption,
  MinorityChoiceState,
} from "@/features/games/minority-choice/types";
import { maybeFlip } from "@/features/bots/mistake";

function opponentId(
  state: MinorityChoiceState,
  botParticipantId: string,
): string {
  return state.participantIds.find((id) => id !== botParticipantId)!;
}

function previewForRound(state: MinorityChoiceState): CrowdPreview {
  return (
    state.crowdPreviewByRound?.[state.round] ??
    crowdPreview(simulateCrowd(state.sessionId, state.round))
  );
}

/** The side the published votes say is scarcer — the "obvious" pick everyone can compute. */
function revealedMinority(preview: CrowdPreview): MinorityChoiceOption {
  return preview.revealedA <= preview.revealedB ? "A" : "B";
}

/** How often the opponent's declared side matched their final pick in past rounds (0.5 default). */
function opponentDeclarationHonesty(
  state: MinorityChoiceState,
  opponent: string,
): number {
  const observed = state.history.filter(
    (record) => record.declarations?.[opponent] && record.actions[opponent],
  );
  if (observed.length === 0) return 0.5;
  const honest = observed.filter(
    (record) =>
      record.declarations[opponent].actionData.choice ===
      (record.actions[opponent] as MinorityChoiceAction).actionData.choice,
  ).length;
  return honest / observed.length;
}

/**
 * Core read: with the crowd survey public, a wide revealed gap makes the minority side nearly
 * certain (the hidden votes can't flip it), so everyone piles onto it and the round washes.
 * The game lives in the close rounds, where the hidden votes and the opponent's ±1 matter —
 * there the personalities split between trusting the survey and playing the contrarian flip.
 */
function byPersonality(
  state: MinorityChoiceState,
  bot: BotPlayer,
  random: () => number,
): MinorityChoiceOption {
  const preview = previewForRound(state);
  const safe = revealedMinority(preview);
  const contrarian: MinorityChoiceOption = safe === "A" ? "B" : "A";
  const revealedGap = Math.abs(preview.revealedA - preview.revealedB);
  // Hidden votes + both contestants can shift the balance by at most hiddenCount + 2.
  const flippable = revealedGap <= preview.hiddenCount + 2;

  switch (bot.personality) {
    case BotPersonality.CAUTIOUS:
      // Always banks the published read — predictable, and exploitable by players who notice.
      return safe;
    case BotPersonality.AGGRESSIVE:
    case BotPersonality.BETRAYER:
      // Bets on the flip whenever the round is genuinely close; otherwise even they take the sure read.
      return flippable && random() < 0.55 + bot.riskTolerance / 400
        ? contrarian
        : safe;
    case BotPersonality.PATTERN:
      return state.round % 2 === 1 ? safe : contrarian;
    case BotPersonality.ANALYST: {
      if (!flippable) return safe;
      // Close round: reason about the opponent instead of the crowd. If their (honesty-weighted)
      // declaration says they're on the safe side too, dodge the pile-up by going contrarian.
      const opponent = opponentId(state, bot.participantId);
      const declared = state.declarations[opponent]?.actionData.choice;
      if (declared) {
        const honesty = opponentDeclarationHonesty(state, opponent);
        const opponentOnSafeSide = declared === safe ? honesty : 1 - honesty;
        const weight = 0.4 + bot.observation / 250;
        if (random() < opponentOnSafeSide * weight) return contrarian;
      }
      return safe;
    }
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

function declare(
  state: MinorityChoiceState,
  bot: BotPlayer,
  random: () => number,
): MinorityChoiceDeclareAction {
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

function choose(
  state: MinorityChoiceState,
  bot: BotPlayer,
  random: () => number,
): MinorityChoiceChooseAction {
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
  return state.phase === "DECLARE"
    ? declare(state, bot, random)
    : choose(state, bot, random);
}
