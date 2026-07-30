import { describe, expect, it } from "vitest";
import { computeMinorityScore, crowdPreview, simulateCrowd } from "@/features/games/minority-choice/scoring";
import { MINORITY_CHOICE_CROWD_REVEALED, MINORITY_CHOICE_CROWD_SIZE } from "@/config/games/minority-choice";

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
    expect(crowd.aCount + crowd.bCount).toBe(MINORITY_CHOICE_CROWD_SIZE);
  });

  it("uses an odd crowd size so a round can never end with no minority side", () => {
    // 21 crowd votes + 2 contestant votes = 23 (odd) — totals can never tie.
    expect(MINORITY_CHOICE_CROWD_SIZE % 2).toBe(1);
  });
});

describe("minority-choice crowdPreview", () => {
  it("always publishes exactly the configured number of votes", () => {
    for (let a = 0; a <= MINORITY_CHOICE_CROWD_SIZE; a++) {
      const preview = crowdPreview({ aCount: a, bCount: MINORITY_CHOICE_CROWD_SIZE - a });
      expect(preview.revealedA + preview.revealedB).toBe(MINORITY_CHOICE_CROWD_REVEALED);
      expect(preview.hiddenCount).toBe(MINORITY_CHOICE_CROWD_SIZE - MINORITY_CHOICE_CROWD_REVEALED);
    }
  });

  it("never lies: the hidden remainder can always account for the true totals", () => {
    for (let a = 0; a <= MINORITY_CHOICE_CROWD_SIZE; a++) {
      const crowd = { aCount: a, bCount: MINORITY_CHOICE_CROWD_SIZE - a };
      const preview = crowdPreview(crowd);
      const hiddenA = crowd.aCount - preview.revealedA;
      const hiddenB = crowd.bCount - preview.revealedB;
      expect(hiddenA).toBeGreaterThanOrEqual(0);
      expect(hiddenB).toBeGreaterThanOrEqual(0);
      expect(hiddenA + hiddenB).toBe(preview.hiddenCount);
    }
  });

  it("is deterministic for a given crowd", () => {
    const crowd = simulateCrowd("session-z", 1);
    expect(crowdPreview(crowd)).toEqual(crowdPreview(crowd));
  });
});
