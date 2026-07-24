import { describe, expect, it } from "vitest";
import { numberBluffGame } from "@/features/games/number-bluff";
import type { GameContext } from "@/domain/interfaces/psychological-game";

const context: GameContext = {
  sessionId: "session-nb",
  participants: [
    { participantId: "p1", type: "HUMAN" as never, displayName: "Alice" },
    { participantId: "p2", type: "BOT" as never, displayName: "Bob" },
  ],
  timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
};

describe("number-bluff game flow", () => {
  it("moves from DECLARE to RESPOND once both declare, then resolves the round", () => {
    let state = numberBluffGame.initialize(context);
    expect(state.phase).toBe("DECLARE");

    state = numberBluffGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { number: 7, declarationId: "gte-5" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("DECLARE");

    state = numberBluffGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      actionData: { number: 2, declarationId: "gte-5" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("RESPOND");

    state = numberBluffGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "RESPOND",
      actionData: { believe: false },
      submittedAt: Date.now(),
    });
    state = numberBluffGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "RESPOND",
      actionData: { believe: true },
      submittedAt: Date.now(),
    });

    expect(state.round).toBe(2);
    expect(state.phase).toBe("DECLARE");
    expect(state.history).toHaveLength(1);
    expect(state.scores.p1).toBe(3);
    expect(state.scores.p2).toBe(0);
  });

  it("rejects a RESPOND action while still in the DECLARE phase", () => {
    const state = numberBluffGame.initialize(context);
    expect(() =>
      numberBluffGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "RESPOND",
        actionData: { believe: true },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });
});
