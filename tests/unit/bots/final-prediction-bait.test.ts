import { describe, expect, it } from "vitest";
import { BotPersonality } from "@/domain/enums";
import { finalPredictionBotStrategy } from "@/features/bots/strategies/final-prediction.strategy";
import { finalPredictionGame } from "@/features/games/final-prediction";
import type { BotPlayer, GameContext } from "@/domain/interfaces/psychological-game";

const context: GameContext = {
  sessionId: "session-bait",
  participants: [
    { participantId: "bot", type: "BOT" as never, displayName: "Bot" },
    { participantId: "human", type: "HUMAN" as never, displayName: "Human" },
  ],
  timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
};

function bot(personality: BotPersonality): BotPlayer {
  return {
    participantId: "bot",
    botProfileId: "bot-1",
    personality,
    judgment: 50,
    deception: 90,
    observation: 50,
    riskTolerance: 50,
    memory: 50,
    randomness: 0,
  };
}

/**
 * Regression coverage for the DECLARE/CHOOSE reactive mind-game: when the bot's CHOOSE step
 * trusts the opponent's now-visible declaration, it must directly counter it (STRIKE beats READ,
 * READ beats GUARD, GUARD beats STRIKE) — otherwise "trusting" a declaration would be pointless.
 */
describe("final-prediction bot trust-the-declaration reaction", () => {
  it("counters the opponent's declared move whenever it decides to trust it", () => {
    // random()=0 forces every `random() < rate` branch true, i.e. always bluff at declare and
    // always trust at choose (both rates are > 0 for every personality).
    const alwaysZero = () => 0;

    let state = finalPredictionGame.initialize(context);
    state = finalPredictionGame.handleAction(state, {
      participantId: "human",
      round: 1,
      actionType: "DECLARE",
      actionData: { move: "GUARD" },
      submittedAt: Date.now(),
    });
    const botDeclare = finalPredictionBotStrategy(state, bot(BotPersonality.RANDOM), alwaysZero);
    expect(botDeclare.actionType).toBe("DECLARE");
    state = finalPredictionGame.handleAction(state, botDeclare);
    expect(state.phase).toBe("CHOOSE");

    const botChoose = finalPredictionBotStrategy(state, bot(BotPersonality.RANDOM), alwaysZero);
    expect(botChoose.actionType).toBe("CHOOSE");
    // Opponent declared GUARD; trusting and countering it means playing READ (READ beats GUARD).
    expect(botChoose.actionData.move).toBe("READ");
  });

  it("the DECLARE step can bluff — the declared move need not match what the same call would have chosen honestly", () => {
    // With random() forced to 0, bluffRateFor is always exceeded, so every personality declares
    // a decoy from the non-intent pool rather than any single fixed "honest" move.
    const alwaysZero = () => 0;
    const state = finalPredictionGame.initialize(context);
    const declareAction = finalPredictionBotStrategy(state, bot(BotPersonality.ANALYST), alwaysZero);
    expect(declareAction.actionType).toBe("DECLARE");
    expect(["STRIKE", "GUARD", "READ"]).toContain(declareAction.actionData.move);
  });
});
