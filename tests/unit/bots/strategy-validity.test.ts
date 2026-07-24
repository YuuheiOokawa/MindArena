import { describe, expect, it } from "vitest";
import { BotPersonality } from "@/domain/enums";
import { createSeededRandom } from "@/lib/utils/seeded-random";
import { resolveBotStrategy } from "@/features/bots/strategy-registry";
import { trustOrBetrayGame } from "@/features/games/trust-or-betray";
import { minorityChoiceGame } from "@/features/games/minority-choice";
import { finalPredictionGame } from "@/features/games/final-prediction";
import { numberBluffGame } from "@/features/games/number-bluff";
import type { BotPlayer, GameContext } from "@/domain/interfaces/psychological-game";

const context: GameContext = {
  sessionId: "session-validity",
  participants: [
    { participantId: "p1", type: "BOT" as never, displayName: "A" },
    { participantId: "p2", type: "BOT" as never, displayName: "B" },
  ],
  timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
};

function bot(personality: BotPersonality): BotPlayer {
  return {
    participantId: "p1",
    botProfileId: "bot-1",
    personality,
    judgment: 50,
    deception: 50,
    observation: 50,
    riskTolerance: 50,
    memory: 50,
    randomness: 40,
  };
}

const PERSONALITIES = Object.values(BotPersonality);

describe("bot strategy action validity", () => {
  it("trust-or-betray always returns a valid choice for every personality", () => {
    const random = createSeededRandom(99);
    const state = trustOrBetrayGame.initialize(context);
    for (const personality of PERSONALITIES) {
      const strategy = resolveBotStrategy("trust-or-betray", personality);
      const action = strategy(state, bot(personality), random) as { actionData: { choice: string } };
      expect(["TRUST", "BETRAY"]).toContain(action.actionData.choice);
    }
  });

  it("minority-choice always returns A or B for every personality", () => {
    const random = createSeededRandom(99);
    const state = minorityChoiceGame.initialize(context);
    for (const personality of PERSONALITIES) {
      const strategy = resolveBotStrategy("minority-choice", personality);
      const action = strategy(state, bot(personality), random) as { actionData: { choice: string } };
      expect(["A", "B"]).toContain(action.actionData.choice);
    }
  });

  it("final-prediction always returns a valid move for every personality", () => {
    const random = createSeededRandom(99);
    const state = finalPredictionGame.initialize(context);
    for (const personality of PERSONALITIES) {
      const strategy = resolveBotStrategy("final-prediction", personality);
      const action = strategy(state, bot(personality), random) as { actionData: { move: string } };
      expect(["STRIKE", "GUARD", "READ"]).toContain(action.actionData.move);
    }
  });

  it("number-bluff declare phase always returns a number 1-9 and a known declaration id", () => {
    const random = createSeededRandom(99);
    const state = numberBluffGame.initialize(context);
    for (const personality of PERSONALITIES) {
      const strategy = resolveBotStrategy("number-bluff", personality);
      const action = strategy(state, bot(personality), random) as {
        actionData: { number: number; declarationId: string };
      };
      expect(action.actionData.number).toBeGreaterThanOrEqual(1);
      expect(action.actionData.number).toBeLessThanOrEqual(9);
      expect(["gte-5", "odd", "greater-than-opponent", "lte-3"]).toContain(action.actionData.declarationId);
    }
  });
});
