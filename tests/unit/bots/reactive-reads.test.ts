import { describe, expect, it } from "vitest";
import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";
import { trustOrBetrayBotStrategy } from "@/features/bots/strategies/trust-or-betray.strategy";
import { minorityChoiceBotStrategy } from "@/features/bots/strategies/minority-choice.strategy";
import { numberBluffBotStrategy } from "@/features/bots/strategies/number-bluff.strategy";
import type { TrustOrBetrayState } from "@/features/games/trust-or-betray/types";
import type { MinorityChoiceState } from "@/features/games/minority-choice/types";
import type { NumberBluffState } from "@/features/games/number-bluff/types";

/**
 * The 心理戦 depth requirement: bots must REACT to what the player shows them — declarations,
 * declaration honesty, lie history — so the player's bluffing decisions genuinely change
 * outcomes. These tests pin the reads with zero-randomness bots and fixed RNG.
 */

function bot(personality: BotPersonality, overrides: Partial<BotPlayer> = {}): BotPlayer {
  return {
    participantId: "p1",
    botProfileId: "bot-1",
    personality,
    judgment: 80,
    deception: 80,
    observation: 99,
    riskTolerance: 50,
    memory: 80,
    randomness: 0, // no mistake flips — we're testing the read itself
    ...overrides,
  };
}

function tobDeclare(id: string, round: number, choice: "TRUST" | "BETRAY") {
  return { participantId: id, round, actionType: "DECLARE" as const, actionData: { choice }, submittedAt: 0 };
}
function tobChoose(id: string, round: number, choice: "TRUST" | "BETRAY") {
  return { participantId: id, round, actionType: "CHOOSE" as const, actionData: { choice }, submittedAt: 0 };
}

function tobState(overrides: Partial<TrustOrBetrayState>): TrustOrBetrayState {
  return {
    gameId: "trust-or-betray",
    sessionId: "s",
    round: 3,
    totalRounds: 3,
    status: "IN_PROGRESS",
    scores: { p1: 0, p2: 0 },
    history: [],
    participantIds: ["p1", "p2"],
    phase: "CHOOSE",
    declarations: {},
    pendingActions: {},
    ...overrides,
  };
}

describe("trust-or-betray bots read declarations and honesty", () => {
  it("punishes a proven-honest opponent who declares TRUST by betraying them", () => {
    const state = tobState({
      history: [1, 2].map((round) => ({
        round,
        actions: { p2: tobChoose("p2", round, "TRUST"), p1: tobChoose("p1", round, "TRUST") },
        declarations: { p2: tobDeclare("p2", round, "TRUST"), p1: tobDeclare("p1", round, "TRUST") },
        outcome: { p1: 1, p2: 1 },
      })),
      declarations: { p2: tobDeclare("p2", 3, "TRUST") },
    });
    const action = trustOrBetrayBotStrategy(state, bot(BotPersonality.ANALYST), () => 0.99);
    expect(action.actionData.choice).toBe("BETRAY");
  });

  it("inverts a proven liar's TRUST declaration and plays safe with TRUST", () => {
    const state = tobState({
      history: [1, 2].map((round) => ({
        round,
        // p2 declared TRUST both rounds but actually betrayed — a 100% liar and 100% betrayer.
        actions: { p2: tobChoose("p2", round, "BETRAY"), p1: tobChoose("p1", round, "TRUST") },
        declarations: { p2: tobDeclare("p2", round, "TRUST"), p1: tobDeclare("p1", round, "TRUST") },
        outcome: { p1: 0, p2: 2 },
      })),
      declarations: { p2: tobDeclare("p2", 3, "TRUST") },
    });
    // P(betray) reads as ~1 — even the BETRAYER personality declines to crash into it.
    for (const personality of [BotPersonality.ANALYST, BotPersonality.CAUTIOUS, BotPersonality.BETRAYER]) {
      const action = trustOrBetrayBotStrategy(state, bot(personality), () => 0.99);
      expect(action.actionData.choice, personality).toBe("TRUST");
    }
  });
});

describe("minority-choice bots read the published crowd survey", () => {
  function mcState(preview: { revealedA: number; revealedB: number; hiddenCount: number }): MinorityChoiceState {
    return {
      gameId: "minority-choice",
      sessionId: "s",
      round: 1,
      totalRounds: 3,
      status: "IN_PROGRESS",
      scores: { p1: 0, p2: 0 },
      history: [],
      participantIds: ["p1", "p2"],
      phase: "CHOOSE",
      declarations: {},
      pendingActions: {},
      crowdByRound: {},
      crowdPreviewByRound: { 1: preview },
    };
  }

  it("every reactive personality banks a decisive revealed gap (hidden votes can't flip it)", () => {
    const state = mcState({ revealedA: 4, revealedB: 13, hiddenCount: 4 });
    for (const personality of [BotPersonality.CAUTIOUS, BotPersonality.AGGRESSIVE, BotPersonality.ANALYST]) {
      const action = minorityChoiceBotStrategy(state, bot(personality), () => 0);
      expect(action.actionData.choice, personality).toBe("A");
    }
  });

  it("aggressive personalities play the contrarian flip only when the round is genuinely close", () => {
    const close = mcState({ revealedA: 8, revealedB: 9, hiddenCount: 4 });
    const action = minorityChoiceBotStrategy(close, bot(BotPersonality.AGGRESSIVE), () => 0);
    expect(action.actionData.choice).toBe("B"); // revealed minority is A — it bets on the flip
  });
});

describe("number-bluff bots learn the opponent's lie rate", () => {
  function nbState(withLies: boolean): NumberBluffState {
    const declare = (id: string, round: number, number: number, declarationId: "gte-5") => ({
      participantId: id,
      round,
      actionType: "DECLARE" as const,
      actionData: { number, declarationId },
      submittedAt: 0,
    });
    const respond = (id: string, round: number) => ({
      participantId: id,
      round,
      actionType: "RESPOND" as const,
      actionData: { believe: true },
      submittedAt: 0,
    });
    return {
      gameId: "number-bluff",
      sessionId: "s",
      round: 3,
      totalRounds: 3,
      status: "IN_PROGRESS",
      scores: { p1: 0, p2: 0 },
      participantIds: ["p1", "p2"],
      phase: "RESPOND",
      pendingDeclarations: { p2: declare("p2", 3, 2, "gte-5"), p1: declare("p1", 3, 7, "gte-5") },
      pendingResponses: {},
      history: withLies
        ? [1, 2].map((round) => ({
            round,
            // p2 declared "5以上" holding a 1 both rounds — a 100% observed lie rate.
            actions: { p2: declare("p2", round, 1, "gte-5"), p1: declare("p1", round, 7, "gte-5") },
            responses: { p1: respond("p1", round), p2: respond("p2", round) },
            outcome: { p1: 0, p2: 0 },
          }))
        : [],
    };
  }

  it("an observant bot doubts a proven liar it would have believed on a blank record", () => {
    const roll = () => 0.6; // fixed roll: believe iff suspicion <= 0.6
    const freshRead = numberBluffBotStrategy(nbState(false), bot(BotPersonality.CAUTIOUS), roll);
    expect(freshRead.actionData).toEqual({ believe: true }); // base suspicion 0.55 — believes

    const informedRead = numberBluffBotStrategy(nbState(true), bot(BotPersonality.CAUTIOUS), roll);
    expect(informedRead.actionData).toEqual({ believe: false }); // lie history pushes suspicion past the roll
  });
});
