import { describe, expect, it } from "vitest";
import { getMissionProgress, isMissionComplete, type DailyMissionCounters } from "@/domain/services/daily-mission.service";
import type { DailyMissionConfig } from "@/config/daily-missions";

function mission(overrides: Partial<DailyMissionConfig>): DailyMissionConfig {
  return { code: "TEST", name: "test", description: "test", conditionType: "MATCHES_PLAYED", target: 1, rewardPoints: 10, rewardPrizeCurrency: 0, ...overrides };
}

const ZERO_COUNTERS: DailyMissionCounters = { loginBonusClaimedToday: false, matchesPlayedToday: 0, matchesWonToday: 0 };

describe("getMissionProgress / isMissionComplete", () => {
  it("LOGIN_BONUS_CLAIMED reads as 0 or 1 from the boolean flag", () => {
    const m = mission({ conditionType: "LOGIN_BONUS_CLAIMED", target: 1 });
    expect(getMissionProgress(m, ZERO_COUNTERS)).toBe(0);
    expect(isMissionComplete(m, ZERO_COUNTERS)).toBe(false);
    expect(getMissionProgress(m, { ...ZERO_COUNTERS, loginBonusClaimedToday: true })).toBe(1);
    expect(isMissionComplete(m, { ...ZERO_COUNTERS, loginBonusClaimedToday: true })).toBe(true);
  });

  it("MATCHES_PLAYED reads the matches-played counter against its target", () => {
    const m = mission({ conditionType: "MATCHES_PLAYED", target: 3 });
    expect(isMissionComplete(m, { ...ZERO_COUNTERS, matchesPlayedToday: 2 })).toBe(false);
    expect(getMissionProgress(m, { ...ZERO_COUNTERS, matchesPlayedToday: 2 })).toBe(2);
    expect(isMissionComplete(m, { ...ZERO_COUNTERS, matchesPlayedToday: 3 })).toBe(true);
  });

  it("MATCHES_WON reads the wins counter against its target", () => {
    const m = mission({ conditionType: "MATCHES_WON", target: 1 });
    expect(isMissionComplete(m, { ...ZERO_COUNTERS, matchesWonToday: 0 })).toBe(false);
    expect(isMissionComplete(m, { ...ZERO_COUNTERS, matchesWonToday: 1 })).toBe(true);
  });
});
