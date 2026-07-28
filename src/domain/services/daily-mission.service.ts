import type { DailyMissionConfig } from "@/config/daily-missions";

export interface DailyMissionCounters {
  loginBonusClaimedToday: boolean;
  matchesPlayedToday: number;
  matchesWonToday: number;
}

export function getMissionProgress(mission: DailyMissionConfig, counters: DailyMissionCounters): number {
  switch (mission.conditionType) {
    case "LOGIN_BONUS_CLAIMED":
      return counters.loginBonusClaimedToday ? 1 : 0;
    case "MATCHES_PLAYED":
      return counters.matchesPlayedToday;
    case "MATCHES_WON":
      return counters.matchesWonToday;
  }
}

export function isMissionComplete(mission: DailyMissionConfig, counters: DailyMissionCounters): boolean {
  return getMissionProgress(mission, counters) >= mission.target;
}
