import { describe, expect, it } from "vitest";
import { scoreRound } from "@/features/games/final-prediction/scoring";

describe("final-prediction scoring (three-way, source spec: STRIKE beats READ, READ beats GUARD, GUARD beats STRIKE)", () => {
  it("STRIKE beats READ", () => {
    expect(scoreRound("STRIKE", "READ")).toEqual({ scoreA: 1, scoreB: 0 });
  });

  it("READ beats GUARD", () => {
    expect(scoreRound("READ", "GUARD")).toEqual({ scoreA: 1, scoreB: 0 });
  });

  it("GUARD beats STRIKE", () => {
    expect(scoreRound("GUARD", "STRIKE")).toEqual({ scoreA: 1, scoreB: 0 });
  });

  it("identical moves are a draw", () => {
    for (const move of ["STRIKE", "READ", "GUARD"] as const) {
      expect(scoreRound(move, move)).toEqual({ scoreA: 0, scoreB: 0 });
    }
  });

  it("is antisymmetric", () => {
    expect(scoreRound("READ", "STRIKE")).toEqual({ scoreA: 0, scoreB: 1 });
  });
});
