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

  function declare(state: ReturnType<typeof trustOrBetrayGame.initialize>, round: number, participantId: string, choice: "TRUST" | "BETRAY") {
    return trustOrBetrayGame.handleAction(state, {
      participantId,
      round,
      actionType: "DECLARE",
      actionData: { choice },
      submittedAt: Date.now(),
    });
  }

  function choose(state: ReturnType<typeof trustOrBetrayGame.initialize>, round: number, participantId: string, choice: "TRUST" | "BETRAY") {
    return trustOrBetrayGame.handleAction(state, {
      participantId,
      round,
      actionType: "CHOOSE",
      actionData: { choice },
      submittedAt: Date.now(),
    });
  }

  it("accumulates score across 3 rounds and declares a winner", () => {
    let state = trustOrBetrayGame.initialize(context);

    for (let round = 1; round <= 3; round++) {
      state = declare(state, round, "p1", "BETRAY");
      state = declare(state, round, "p2", "TRUST");
      expect(state.phase).toBe("CHOOSE");
      state = choose(state, round, "p1", "BETRAY");
      state = choose(state, round, "p2", "TRUST");
    }

    expect(state.status).toBe("COMPLETE");
    const result = trustOrBetrayGame.calculateResult(state);
    expect(result.isDraw).toBe(false);
    expect(result.winnerParticipantId).toBe("p1");
    expect(result.finalScores.p1).toBe(6);
    expect(result.finalScores.p2).toBe(0);
  });

  it("allows the final CHOOSE to diverge from the declared bluff", () => {
    let state = trustOrBetrayGame.initialize(context);
    state = declare(state, 1, "p1", "TRUST");
    state = declare(state, 1, "p2", "TRUST");

    // p1 declared TRUST but locks in BETRAY — a bluff.
    state = choose(state, 1, "p1", "BETRAY");
    state = choose(state, 1, "p2", "TRUST");

    expect(state.history[0].declarations.p1.actionData.choice).toBe("TRUST");
    expect((state.history[0].actions.p1.actionData as { choice: string }).choice).toBe("BETRAY");
  });

  it("rejects a duplicate DECLARE for the same round", () => {
    let state = trustOrBetrayGame.initialize(context);
    state = declare(state, 1, "p1", "TRUST");

    expect(() => declare(state, 1, "p1", "BETRAY")).toThrow();
  });

  it("rejects a CHOOSE action while still in the DECLARE phase", () => {
    const state = trustOrBetrayGame.initialize(context);
    expect(() => choose(state, 1, "p1", "TRUST")).toThrow();
  });

  it("extends by one round on a tie via resolveTiebreak", () => {
    let state = trustOrBetrayGame.initialize(context);
    for (let round = 1; round <= 3; round++) {
      state = declare(state, round, "p1", "TRUST");
      state = declare(state, round, "p2", "TRUST");
      state = choose(state, round, "p1", "TRUST");
      state = choose(state, round, "p2", "TRUST");
    }

    expect(trustOrBetrayGame.calculateResult(state).isDraw).toBe(true);
    const extended = trustOrBetrayGame.resolveTiebreak(state);
    expect(extended.totalRounds).toBe(4);
    expect(extended.status).toBe("IN_PROGRESS");
  });
});
