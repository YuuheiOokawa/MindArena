import type { AchievementConfig } from "@/config/achievements";

/** The stats needed to check every ACHIEVEMENTS conditionType (config/achievements.ts) —
 * gathered once by the caller so this stays a pure, easily-testable function. */
export interface AchievementCheckStats {
  totalMatches: number;
  totalWins: number;
  bestWinStreak: number;
  finalsReached: number;
  tournamentWins: number;
  tournamentEntries: number;
  totalPoints: number;
  distinctGamesPlayed: number;
}

function isAchievementConditionMet(achievement: AchievementConfig, stats: AchievementCheckStats): boolean {
  switch (achievement.conditionType) {
    case "TOTAL_MATCHES":
      return stats.totalMatches >= achievement.conditionValue;
    case "TOTAL_WINS":
      return stats.totalWins >= achievement.conditionValue;
    case "WIN_STREAK":
      return stats.bestWinStreak >= achievement.conditionValue;
    case "FINALS_REACHED":
      return stats.finalsReached >= achievement.conditionValue;
    case "TOURNAMENT_WINS":
      return stats.tournamentWins >= achievement.conditionValue;
    case "TOURNAMENT_ENTRIES":
      return stats.tournamentEntries >= achievement.conditionValue;
    case "ALL_GAMES_PLAYED":
      return stats.distinctGamesPlayed >= achievement.conditionValue;
    case "WIN_RATE_MIN_10_MATCHES":
      return stats.totalMatches >= 10 && (stats.totalWins / stats.totalMatches) * 100 >= achievement.conditionValue;
    case "LEAGUE_REACHED":
      return stats.totalPoints >= achievement.conditionValue;
  }
}

/** Raw progress value for an achievement's conditionType, in the same unit as conditionValue —
 * used to render a locked-but-visible achievement's progress bar on the catalog screen. */
export function getAchievementProgress(achievement: AchievementConfig, stats: AchievementCheckStats): number {
  switch (achievement.conditionType) {
    case "TOTAL_MATCHES":
      return stats.totalMatches;
    case "TOTAL_WINS":
      return stats.totalWins;
    case "WIN_STREAK":
      return stats.bestWinStreak;
    case "FINALS_REACHED":
      return stats.finalsReached;
    case "TOURNAMENT_WINS":
      return stats.tournamentWins;
    case "TOURNAMENT_ENTRIES":
      return stats.tournamentEntries;
    case "ALL_GAMES_PLAYED":
      return stats.distinctGamesPlayed;
    case "WIN_RATE_MIN_10_MATCHES":
      return stats.totalMatches >= 10 ? Math.floor((stats.totalWins / stats.totalMatches) * 100) : 0;
    case "LEAGUE_REACHED":
      return stats.totalPoints;
  }
}

/** Achievements whose condition is now met but aren't in `alreadyUnlockedCodes` yet. */
export function findNewlyMetAchievements(
  achievements: AchievementConfig[],
  alreadyUnlockedCodes: ReadonlySet<string>,
  stats: AchievementCheckStats,
): AchievementConfig[] {
  return achievements.filter((a) => !alreadyUnlockedCodes.has(a.code) && isAchievementConditionMet(a, stats));
}
