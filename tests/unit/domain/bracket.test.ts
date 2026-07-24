import { describe, expect, it } from "vitest";
import { generateBracket, isFinalRound, pairNextRound, totalRoundsFor } from "@/domain/services/bracket.service";

function participants(count: number) {
  return Array.from({ length: count }, (_, i) => ({ participantId: `p${i}`, displayName: `Player ${i}` }));
}

describe("bracket.service", () => {
  it("generates 16 round-1 matches from 32 participants", () => {
    const matches = generateBracket(participants(32), 42);
    expect(matches).toHaveLength(16);
    expect(matches.every((m) => m.round === 1)).toBe(true);
  });

  it("includes every participant exactly once", () => {
    const matches = generateBracket(participants(32), 42);
    const seen = new Set<string>();
    for (const match of matches) {
      seen.add(match.participant1Id);
      seen.add(match.participant2Id);
    }
    expect(seen.size).toBe(32);
  });

  it("is deterministic for the same seed", () => {
    const a = generateBracket(participants(32), 7);
    const b = generateBracket(participants(32), 7);
    expect(a).toEqual(b);
  });

  it("produces a different pairing for a different seed", () => {
    const a = generateBracket(participants(32), 1);
    const b = generateBracket(participants(32), 2);
    expect(a).not.toEqual(b);
  });

  it("rejects an odd participant count", () => {
    expect(() => generateBracket(participants(31), 1)).toThrow();
  });

  it("pairs winners in bracket order for the next round", () => {
    const winners = ["a", "b", "c", "d"];
    const next = pairNextRound(2, winners);
    expect(next).toEqual([
      { round: 2, matchNumber: 1, participant1Id: "a", participant2Id: "b" },
      { round: 2, matchNumber: 2, participant1Id: "c", participant2Id: "d" },
    ]);
  });

  it("computes total rounds for a 32-player bracket as 5", () => {
    expect(totalRoundsFor(32)).toBe(5);
  });

  it("identifies the final round correctly", () => {
    expect(isFinalRound(5, 32)).toBe(true);
    expect(isFinalRound(4, 32)).toBe(false);
  });
});
