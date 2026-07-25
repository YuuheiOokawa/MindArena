import { describe, expect, it } from "vitest";
import { finalPredictionGame } from "@/features/games/final-prediction";
import type { GameContext } from "@/domain/interfaces/psychological-game";

const context: GameContext = {
  sessionId: "session-fp",
  participants: [
    { participantId: "p1", type: "HUMAN" as never, displayName: "Alice" },
    { participantId: "p2", type: "BOT" as never, displayName: "Bob" },
  ],
  timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
};

describe("final-prediction game flow", () => {
  it("moves from DECLARE to CHOOSE once both declare, then resolves the round", () => {
    let state = finalPredictionGame.initialize(context);
    expect(state.phase).toBe("DECLARE");

    state = finalPredictionGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { move: "STRIKE" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("DECLARE");

    state = finalPredictionGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      actionData: { move: "GUARD" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("CHOOSE");

    state = finalPredictionGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "CHOOSE",
      actionData: { move: "STRIKE" },
      submittedAt: Date.now(),
    });
    state = finalPredictionGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "CHOOSE",
      actionData: { move: "READ" },
      submittedAt: Date.now(),
    });

    expect(state.round).toBe(2);
    expect(state.phase).toBe("DECLARE");
    expect(state.history).toHaveLength(1);
    expect(state.history[0].declarations.p1.actionData.move).toBe("STRIKE");
    expect((state.history[0].actions.p2.actionData as { move: string }).move).toBe("READ");
  });

  it("rejects a CHOOSE action while still in the DECLARE phase", () => {
    const state = finalPredictionGame.initialize(context);
    expect(() =>
      finalPredictionGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "CHOOSE",
        actionData: { move: "STRIKE" },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });

  it("rejects a duplicate DECLARE for the same round", () => {
    let state = finalPredictionGame.initialize(context);
    state = finalPredictionGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { move: "STRIKE" },
      submittedAt: Date.now(),
    });

    expect(() =>
      finalPredictionGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "DECLARE",
        actionData: { move: "GUARD" },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });
});
