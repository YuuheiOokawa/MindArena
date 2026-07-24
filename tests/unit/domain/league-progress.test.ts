import { describe, expect, it } from "vitest";
import { getCurrentLeague, getLeagueProgress, getNextLeague, getUnlockedLeagues } from "@/domain/services/league-progress.service";
import { LEAGUES } from "@/config/leagues";
import type { LeagueEntity } from "@/domain/entities";

const leagues: LeagueEntity[] = LEAGUES.map((l, i) => ({
  id: `league-${i}`,
  code: l.code,
  name: l.name,
  displayName: l.displayName,
  description: l.description,
  requiredPoints: l.requiredPoints,
  rewardMultiplier: l.rewardMultiplier,
  championReward: 0,
  runnerUpReward: 0,
  topFourReward: 0,
  participationReward: 0,
  botDifficulty: l.botDifficulty,
  themeKey: l.themeKey,
  frameKey: l.frameKey,
  displayOrder: l.displayOrder,
  isActive: true,
  gameIds: l.gameIds,
}));

describe("league-progress.service", () => {
  it("unlocks only the entry league at 0 points", () => {
    const unlocked = getUnlockedLeagues(0, leagues);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].code).toBe("BRONZE");
  });

  it("unlocks a league exactly at its threshold", () => {
    const silver = leagues.find((l) => l.code === "SILVER")!;
    const current = getCurrentLeague(silver.requiredPoints, leagues);
    expect(current.code).toBe("SILVER");
  });

  it("does not unlock a league one point below its threshold", () => {
    const silver = leagues.find((l) => l.code === "SILVER")!;
    const current = getCurrentLeague(silver.requiredPoints - 1, leagues);
    expect(current.code).toBe("BRONZE");
  });

  it("returns null nextLeague at the top league", () => {
    const top = leagues[leagues.length - 1];
    expect(getNextLeague(top.requiredPoints, leagues)).toBeNull();
  });

  it("computes a progress ratio between 0 and 1", () => {
    const progress = getLeagueProgress(250, leagues);
    expect(progress.progressRatio).toBeGreaterThanOrEqual(0);
    expect(progress.progressRatio).toBeLessThanOrEqual(1);
  });
});
