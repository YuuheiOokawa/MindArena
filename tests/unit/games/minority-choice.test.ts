import { describe, expect, it } from "vitest";
import { computeMinorityScore, simulateCrowd } from "@/features/games/minority-choice/scoring";

describe("minority-choice computeMinorityScore", () => {
  it("awards the point to whoever picked the minority side", () => {
    const crowd = { aCount: 10, bCount: 5 };
    // totals: A = 10 + 1(playerA) = 11, B = 5 + 1(playerB) = 6 -> B is minority
    const result = computeMinorityScore("A", "B", crowd);
    expect(result.minoritySide).toBe("B");
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(1);
  });

  it("awards nobody on an exact tie", () => {
    const crowd = { aCount: 5, bCount: 5 };
    const result = computeMinorityScore("A", "B", crowd);
    expect(result.minoritySide).toBeNull();
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(0);
  });

  it("both players choosing the minority side both score", () => {
    const crowd = { aCount: 1, bCount: 8 };
    // totals: A = 1 + 2 = 3, B = 8 -> A is minority, both players picked A so both score
    const result = computeMinorityScore("A", "A", crowd);
    expect(result.minoritySide).toBe("A");
    expect(result.scoreA).toBe(1);
    expect(result.scoreB).toBe(1);
  });
});

describe("minority-choice simulateCrowd", () => {
  it("is deterministic for the same session and round", () => {
    const a = simulateCrowd("session-x", 1);
    const b = simulateCrowd("session-x", 1);
    expect(a).toEqual(b);
  });

  it("sums to the configured crowd size", () => {
    const crowd = simulateCrowd("session-y", 2);
    expect(crowd.aCount + crowd.bCount).toBe(20);
  });
});
