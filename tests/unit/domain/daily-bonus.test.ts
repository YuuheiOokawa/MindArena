import { describe, expect, it } from "vitest";
import { canClaimDailyBonus, computeNextStreakDay, toJstDateKey, startOfJstDay } from "@/domain/services/daily-bonus.service";

describe("toJstDateKey", () => {
  it("converts a UTC instant to its JST calendar date", () => {
    // 2026-01-01 15:00 UTC = 2026-01-02 00:00 JST (UTC+9), right at the JST day boundary.
    expect(toJstDateKey(new Date("2026-01-01T15:00:00.000Z"))).toBe("2026-01-02");
    expect(toJstDateKey(new Date("2026-01-01T14:59:59.000Z"))).toBe("2026-01-01");
  });
});

describe("canClaimDailyBonus", () => {
  it("allows a claim when nothing has ever been claimed", () => {
    expect(canClaimDailyBonus(null, new Date("2026-01-05T03:00:00.000Z"))).toBe(true);
  });

  it("blocks a second claim on the same JST calendar day", () => {
    const lastClaimedAt = new Date("2026-01-05T01:00:00.000Z"); // 2026-01-05 10:00 JST
    const now = new Date("2026-01-05T10:00:00.000Z"); // 2026-01-05 19:00 JST, same day
    expect(canClaimDailyBonus(lastClaimedAt, now)).toBe(false);
  });

  it("allows a claim once the JST calendar date has advanced", () => {
    const lastClaimedAt = new Date("2026-01-05T01:00:00.000Z"); // 2026-01-05 JST
    const now = new Date("2026-01-05T15:01:00.000Z"); // 2026-01-06 00:01 JST — new day
    expect(canClaimDailyBonus(lastClaimedAt, now)).toBe(true);
  });
});

describe("computeNextStreakDay", () => {
  it("starts a fresh streak at day 1 when never claimed before", () => {
    expect(computeNextStreakDay(null, 0, new Date("2026-01-05T00:00:00.000Z"))).toBe(1);
  });

  it("continues the streak when the last claim was exactly the JST day before now", () => {
    const yesterday = new Date("2026-01-05T01:00:00.000Z"); // 2026-01-05 JST
    const now = new Date("2026-01-06T01:00:00.000Z"); // 2026-01-06 JST
    expect(computeNextStreakDay(yesterday, 3, now)).toBe(4);
  });

  it("resets the streak to day 1 after a missed day", () => {
    const twoDaysAgo = new Date("2026-01-03T01:00:00.000Z"); // 2026-01-03 JST
    const now = new Date("2026-01-06T01:00:00.000Z"); // 2026-01-06 JST — day 4/5 missed
    expect(computeNextStreakDay(twoDaysAgo, 5, now)).toBe(1);
  });
});

describe("startOfJstDay", () => {
  it("returns the UTC instant matching JST midnight for that calendar day", () => {
    const start = startOfJstDay(new Date("2026-01-05T10:00:00.000Z")); // 2026-01-05 19:00 JST
    expect(start.toISOString()).toBe("2026-01-04T15:00:00.000Z"); // 2026-01-05 00:00 JST
  });
});
