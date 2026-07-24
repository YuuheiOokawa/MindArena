import { describe, expect, it } from "vitest";
import { PointReason } from "@/domain/enums";
import { applyTransaction, calculateReward } from "@/domain/services/points.service";
import { BASE_POINT_REWARDS } from "@/config/points";

describe("points.service", () => {
  it("applies the league reward multiplier to the base reward", () => {
    const reward = calculateReward(PointReason.CHAMPION, { rewardMultiplier: 2 });
    expect(reward).toBe(BASE_POINT_REWARDS[PointReason.CHAMPION] * 2);
  });

  it("rounds fractional rewards to the nearest whole point", () => {
    const reward = calculateReward(PointReason.ROUND_1_CLEAR, { rewardMultiplier: 1.25 });
    expect(Number.isInteger(reward)).toBe(true);
    expect(reward).toBe(Math.round(BASE_POINT_REWARDS[PointReason.ROUND_1_CLEAR] * 1.25));
  });

  it("computes balanceBefore/after and never lets the balance go negative", () => {
    const ledger = applyTransaction(10, -50);
    expect(ledger.balanceBefore).toBe(10);
    expect(ledger.balanceAfter).toBe(0);
    expect(ledger.amount).toBe(-50);
  });

  it("adds points normally for a positive amount", () => {
    const ledger = applyTransaction(100, 25);
    expect(ledger.balanceBefore).toBe(100);
    expect(ledger.balanceAfter).toBe(125);
  });
});
