import { playerGameStatsRepository } from "@/infrastructure/repositories/player-game-stats.repository";
import { gameTypeRepository } from "@/infrastructure/repositories/game-type.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import type { TitleUnlockStats } from "@/domain/services/title-unlock.service";

/** Gathers the handful of async reads `isTitleUnlocked`/`getUnlockedTitleIds` need, from a
 * PlayerProfile row that's already been fetched. Shared between the cosmetics-update validation
 * (features/profiles/update-profile.service.ts) and the profile screen's own display of which
 * titles are selectable (features/profiles/profile.service.ts) so both agree on the same rules. */
export async function computeTitleUnlockStats(profile: {
  id: string;
  totalWins: number;
  totalMatches: number;
  bestWinStreak: number;
  finalsReached: number;
  tournamentWins: number;
  tournamentEntries: number;
  currentLeagueId: string;
}): Promise<TitleUnlockStats> {
  const [distinctGamesPlayed, activeGameTypes, mindKingLeague] = await Promise.all([
    playerGameStatsRepository.countDistinctGamesPlayed(profile.id),
    gameTypeRepository.findAllActive(),
    leagueRepository.findByCode("MIND_KING"),
  ]);

  return {
    totalWins: profile.totalWins,
    totalMatches: profile.totalMatches,
    bestWinStreak: profile.bestWinStreak,
    finalsReached: profile.finalsReached,
    tournamentWins: profile.tournamentWins,
    tournamentEntries: profile.tournamentEntries,
    isMindKingLeague: mindKingLeague?.id === profile.currentLeagueId,
    distinctGamesPlayed,
    activeGameTypeCount: activeGameTypes.length,
  };
}
