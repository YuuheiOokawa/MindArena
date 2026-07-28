import { describe, expect, it } from "vitest";
import { findNewlyMetAchievements, getAchievementProgress, type AchievementCheckStats } from "@/domain/services/achievement-check.service";
import type { AchievementConfig } from "@/config/achievements";

const BASE_STATS: AchievementCheckStats = {
  totalMatches: 0,
  totalWins: 0,
  bestWinStreak: 0,
  finalsReached: 0,
  tournamentWins: 0,
  tournamentEntries: 0,
  totalPoints: 0,
  distinctGamesPlayed: 0,
  loginBonusStreak: 0,
  lifetimePrizeCurrency: 0,
};

function achievement(overrides: Partial<AchievementConfig>): AchievementConfig {
  return { code: "TEST", name: "test", description: "test", conditionType: "TOTAL_MATCHES", conditionValue: 1, rewardPoints: 10, ...overrides };
}

describe("findNewlyMetAchievements", () => {
  it("returns nothing when no condition is met", () => {
    const result = findNewlyMetAchievements([achievement({ conditionType: "TOTAL_MATCHES", conditionValue: 5 })], new Set(), BASE_STATS);
    expect(result).toEqual([]);
  });

  it("returns an achievement whose threshold is now met", () => {
    const a = achievement({ conditionType: "TOTAL_WINS", conditionValue: 3 });
    const result = findNewlyMetAchievements([a], new Set(), { ...BASE_STATS, totalWins: 3 });
    expect(result).toEqual([a]);
  });

  it("excludes an achievement that's already unlocked, even if its condition is met", () => {
    const a = achievement({ code: "FIRST_WIN", conditionType: "TOTAL_WINS", conditionValue: 1 });
    const result = findNewlyMetAchievements([a], new Set(["FIRST_WIN"]), { ...BASE_STATS, totalWins: 5 });
    expect(result).toEqual([]);
  });

  it("evaluates every conditionType correctly", () => {
    const cases: Array<[AchievementConfig["conditionType"], Partial<AchievementCheckStats>, number]> = [
      ["TOTAL_MATCHES", { totalMatches: 10 }, 10],
      ["TOTAL_WINS", { totalWins: 10 }, 10],
      ["WIN_STREAK", { bestWinStreak: 5 }, 5],
      ["FINALS_REACHED", { finalsReached: 1 }, 1],
      ["TOURNAMENT_WINS", { tournamentWins: 1 }, 1],
      ["TOURNAMENT_ENTRIES", { tournamentEntries: 10 }, 10],
      ["ALL_GAMES_PLAYED", { distinctGamesPlayed: 4 }, 4],
      ["LEAGUE_REACHED", { totalPoints: 7000 }, 7000],
      ["LOGIN_STREAK", { loginBonusStreak: 7 }, 7],
      ["LIFETIME_PRIZE_EARNED", { lifetimePrizeCurrency: 1000 }, 1000],
    ];
    for (const [conditionType, statOverride, conditionValue] of cases) {
      const a = achievement({ code: conditionType, conditionType, conditionValue });
      const met = findNewlyMetAchievements([a], new Set(), { ...BASE_STATS, ...statOverride });
      expect(met, `${conditionType} should be met`).toEqual([a]);
      const belowThreshold = findNewlyMetAchievements([a], new Set(), BASE_STATS);
      expect(belowThreshold, `${conditionType} should not be met at baseline`).toEqual([]);
    }
  });

  it("requires at least 10 matches for WIN_RATE_MIN_10_MATCHES even at 100% win rate", () => {
    const a = achievement({ conditionType: "WIN_RATE_MIN_10_MATCHES", conditionValue: 60 });
    const tooFewMatches = findNewlyMetAchievements([a], new Set(), { ...BASE_STATS, totalMatches: 3, totalWins: 3 });
    expect(tooFewMatches).toEqual([]);

    const enoughMatchesHighRate = findNewlyMetAchievements([a], new Set(), { ...BASE_STATS, totalMatches: 10, totalWins: 7 });
    expect(enoughMatchesHighRate).toEqual([a]);

    const enoughMatchesLowRate = findNewlyMetAchievements([a], new Set(), { ...BASE_STATS, totalMatches: 10, totalWins: 5 });
    expect(enoughMatchesLowRate).toEqual([]);
  });
});

describe("getAchievementProgress", () => {
  it("reads the matching stat for every conditionType", () => {
    const cases: Array<[AchievementConfig["conditionType"], Partial<AchievementCheckStats>, number]> = [
      ["TOTAL_MATCHES", { totalMatches: 7 }, 7],
      ["TOTAL_WINS", { totalWins: 4 }, 4],
      ["WIN_STREAK", { bestWinStreak: 6 }, 6],
      ["FINALS_REACHED", { finalsReached: 2 }, 2],
      ["TOURNAMENT_WINS", { tournamentWins: 3 }, 3],
      ["TOURNAMENT_ENTRIES", { tournamentEntries: 9 }, 9],
      ["ALL_GAMES_PLAYED", { distinctGamesPlayed: 2 }, 2],
      ["LEAGUE_REACHED", { totalPoints: 4200 }, 4200],
      ["LOGIN_STREAK", { loginBonusStreak: 5 }, 5],
      ["LIFETIME_PRIZE_EARNED", { lifetimePrizeCurrency: 3000 }, 3000],
    ];
    for (const [conditionType, statOverride, expected] of cases) {
      const a = achievement({ conditionType, conditionValue: 999 });
      expect(getAchievementProgress(a, { ...BASE_STATS, ...statOverride }), conditionType).toBe(expected);
    }
  });

  it("reads WIN_RATE_MIN_10_MATCHES as 0 below the 10-match floor, otherwise as the win percentage", () => {
    const a = achievement({ conditionType: "WIN_RATE_MIN_10_MATCHES", conditionValue: 100 });
    expect(getAchievementProgress(a, { ...BASE_STATS, totalMatches: 3, totalWins: 3 })).toBe(0);
    expect(getAchievementProgress(a, { ...BASE_STATS, totalMatches: 10, totalWins: 7 })).toBe(70);
  });
});
