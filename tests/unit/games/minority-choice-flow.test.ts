import { describe, expect, it } from "vitest";
import { minorityChoiceGame } from "@/features/games/minority-choice";
import type { GameContext } from "@/domain/interfaces/psychological-game";

const context: GameContext = {
  sessionId: "session-mc",
  participants: [
    { participantId: "p1", type: "HUMAN" as never, displayName: "Alice" },
    { participantId: "p2", type: "BOT" as never, displayName: "Bob" },
  ],
  timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
};

describe("minority-choice game flow", () => {
  it("moves from DECLARE to CHOOSE once both declare, then resolves the round", () => {
    let state = minorityChoiceGame.initialize(context);
    expect(state.phase).toBe("DECLARE");

    state = minorityChoiceGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("DECLARE");

    state = minorityChoiceGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "B" },
      submittedAt: Date.now(),
    });
    expect(state.phase).toBe("CHOOSE");

    state = minorityChoiceGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "CHOOSE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "CHOOSE",
      actionData: { choice: "B" },
      submittedAt: Date.now(),
    });

    expect(state.round).toBe(2);
    expect(state.phase).toBe("DECLARE");
    expect(state.history).toHaveLength(1);
    expect(state.history[0].declarations.p1.actionData.choice).toBe("A");
    expect(state.history[0].declarations.p2.actionData.choice).toBe("B");
    expect((state.history[0].actions.p1.actionData as { choice: string }).choice).toBe("A");
  });

  it("allows the final CHOOSE to diverge from the declared bluff", () => {
    let state = minorityChoiceGame.initialize(context);
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });

    // p1 declared A but locks in B — a bluff.
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "CHOOSE",
      actionData: { choice: "B" },
      submittedAt: Date.now(),
    });
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "CHOOSE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });

    expect(state.history[0].declarations.p1.actionData.choice).toBe("A");
    expect((state.history[0].actions.p1.actionData as { choice: string }).choice).toBe("B");
  });

  it("rejects a CHOOSE action while still in the DECLARE phase", () => {
    const state = minorityChoiceGame.initialize(context);
    expect(() =>
      minorityChoiceGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "CHOOSE",
        actionData: { choice: "A" },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });

  it("rejects a DECLARE action once the round has moved to CHOOSE", () => {
    let state = minorityChoiceGame.initialize(context);
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "A" },
      submittedAt: Date.now(),
    });
    state = minorityChoiceGame.handleAction(state, {
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      actionData: { choice: "B" },
      submittedAt: Date.now(),
    });

    expect(() =>
      minorityChoiceGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "DECLARE",
        actionData: { choice: "A" },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });
});
