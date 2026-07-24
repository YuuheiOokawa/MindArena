import { describe, expect, it } from "vitest";
import { calculateWinRate } from "@/domain/services/win-rate.util";

describe("calculateWinRate", () => {
  it("returns 0 when there are no matches", () => {
    expect(calculateWinRate(0, 0)).toBe(0);
  });

  it("computes a percentage rounded to 1 decimal", () => {
    expect(calculateWinRate(1, 3)).toBeCloseTo(33.3, 1);
  });

  it("handles a perfect record", () => {
    expect(calculateWinRate(10, 10)).toBe(100);
  });

  it("handles a winless record", () => {
    expect(calculateWinRate(0, 10)).toBe(0);
  });
});
