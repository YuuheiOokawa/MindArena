import { describe, expect, it } from "vitest";
import { scoreRound } from "@/features/games/trust-or-betray/scoring";
import { trustOrBetrayGame } from "@/features/games/trust-or-betray";
import type { GameContext } from "@/domain/interfaces/psychological-game";

describe("trust-or-betray scoring", () => {
  it("TRUST/TRUST is even for both", () => {
    expect(scoreRound("TRUST", "TRUST")).toEqual({ scoreA: 1, scoreB: 1 });
  });

  it("BETRAY beats TRUST", () => {
    expect(scoreRound("BETRAY", "TRUST")).toEqual({ scoreA: 2, scoreB: 0 });
    expect(scoreRound("TRUST", "BETRAY")).toEqual({ scoreA: 0, scoreB: 2 });
  });

  it("BETRAY/BETRAY penalizes both", () => {
    expect(scoreRound("BETRAY", "BETRAY")).toEqual({ scoreA: -1, scoreB: -1 });
  });
});

describe("trust-or-betray game flow", () => {
  const context: GameContext = {
    sessionId: "session-1",
    participants: [
      { participantId: "p1", type: "HUMAN" as never, displayName: "Alice" },
      { participantId: "p2", type: "BOT" as never, displayName: "Bob" },
    ],
    timers: { ruleExplainSeconds: 10, choiceSeconds: 15, resultSeconds: 4 },
  };

  it("accumulates score across 3 rounds and declares a winner", () => {
    let state = trustOrBetrayGame.initialize(context);

    for (let round = 1; round <= 3; round++) {
      state = trustOrBetrayGame.handleAction(state, {
        participantId: "p1",
        round,
        actionType: "CHOOSE",
        actionData: { choice: "BETRAY" },
        submittedAt: Date.now(),
      });
      state = trustOrBetrayGame.handleAction(state, {
        participantId: "p2",
        round,
        actionType: "CHOOSE",
        actionData: { choice: "TRUST" },
        submittedAt: Date.now(),
      });
    }

    expect(state.status).toBe("COMPLETE");
    const result = trustOrBetrayGame.calculateResult(state);
    expect(result.isDraw).toBe(false);
    expect(result.winnerParticipantId).toBe("p1");
    expect(result.finalScores.p1).toBe(6);
    expect(result.finalScores.p2).toBe(0);
  });

  it("rejects a duplicate action for the same round", () => {
    let state = trustOrBetrayGame.initialize(context);
    state = trustOrBetrayGame.handleAction(state, {
      participantId: "p1",
      round: 1,
      actionType: "CHOOSE",
      actionData: { choice: "TRUST" },
      submittedAt: Date.now(),
    });

    expect(() =>
      trustOrBetrayGame.handleAction(state, {
        participantId: "p1",
        round: 1,
        actionType: "CHOOSE",
        actionData: { choice: "BETRAY" },
        submittedAt: Date.now(),
      }),
    ).toThrow();
  });

  it("extends by one round on a tie via resolveTiebreak", () => {
    let state = trustOrBetrayGame.initialize(context);
    for (let round = 1; round <= 3; round++) {
      state = trustOrBetrayGame.handleAction(state, {
        participantId: "p1",
        round,
        actionType: "CHOOSE",
        actionData: { choice: "TRUST" },
        submittedAt: Date.now(),
      });
      state = trustOrBetrayGame.handleAction(state, {
        participantId: "p2",
        round,
        actionType: "CHOOSE",
        actionData: { choice: "TRUST" },
        submittedAt: Date.now(),
      });
    }

    expect(trustOrBetrayGame.calculateResult(state).isDraw).toBe(true);
    const extended = trustOrBetrayGame.resolveTiebreak(state);
    expect(extended.totalRounds).toBe(4);
    expect(extended.status).toBe("IN_PROGRESS");
  });
});
