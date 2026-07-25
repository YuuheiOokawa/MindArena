/** The stats needed to check every TITLES unlockHint (config/titles.ts) — gathered once by the
 * caller (from PlayerProfile fields plus a couple of small repository reads) so this stays a
 * pure, easily-testable function instead of doing its own async work per title. */
export interface TitleUnlockStats {
  totalWins: number;
  totalMatches: number;
  bestWinStreak: number;
  finalsReached: number;
  tournamentWins: number;
  tournamentEntries: number;
  isMindKingLeague: boolean;
  distinctGamesPlayed: number;
  activeGameTypeCount: number;
}

export function isTitleUnlocked(titleId: string, stats: TitleUnlockStats): boolean {
  switch (titleId) {
    case "novice":
      return true;
    case "first-blood":
      return stats.totalWins >= 1;
    case "streaker":
      return stats.bestWinStreak >= 3;
    case "unbroken":
      return stats.bestWinStreak >= 5;
    case "finalist":
      return stats.finalsReached >= 1;
    case "champion":
      return stats.tournamentWins >= 1;
    case "veteran":
      return stats.tournamentEntries >= 10;
    case "tactician":
      return stats.totalMatches > 0 && stats.totalWins / stats.totalMatches >= 0.6;
    case "silver-tongue":
      return stats.activeGameTypeCount > 0 && stats.distinctGamesPlayed >= stats.activeGameTypeCount;
    case "mind-king":
      return stats.isMindKingLeague;
    default:
      return false;
  }
}

export function getUnlockedTitleIds(titleIds: string[], stats: TitleUnlockStats): string[] {
  return titleIds.filter((id) => isTitleUnlocked(id, stats));
}
