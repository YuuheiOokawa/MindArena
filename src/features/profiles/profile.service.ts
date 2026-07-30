import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { pointTransactionRepository } from "@/infrastructure/repositories/point-transaction.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { leagueTrophyRepository } from "@/infrastructure/repositories/league-trophy.repository";
import { cosmeticItemRepository } from "@/infrastructure/repositories/cosmetic-item.repository";
import { playerGameStatsRepository } from "@/infrastructure/repositories/player-game-stats.repository";
import { getLeagueProgress } from "@/domain/services/league-progress.service";
import {
  resolveFrameTier,
  resolveNextFrameTier,
} from "@/domain/services/profile-decoration.service";
import { getUnlockedTitleIds } from "@/domain/services/title-unlock.service";
import { calculateWinRate } from "@/domain/services/win-rate.util";
import {
  getAchievementProgress,
  type AchievementCheckStats,
} from "@/domain/services/achievement-check.service";
import { computeTitleUnlockStats } from "./title-unlock-stats";
import { getPurchasedTitleIds } from "./purchased-titles";
import { FRAME_TIERS } from "@/config/frames";
import { TITLES } from "@/config/titles";
import { ACHIEVEMENTS } from "@/config/achievements";
import { PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

export async function getMyProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile)
    throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const equippedIds = [
    profile.selectedBackgroundId,
    profile.selectedBadgeId,
  ].filter((id): id is string => Boolean(id));
  const [
    leagues,
    trophies,
    equippedItems,
    titleStats,
    purchasedTitleIds,
    runnerUpCount,
  ] = await Promise.all([
    leagueRepository.findAllActive(),
    leagueTrophyRepository.listForPlayer(profile.id),
    equippedIds.length > 0
      ? cosmeticItemRepository.findManyByIds(equippedIds)
      : Promise.resolve([]),
    computeTitleUnlockStats(profile),
    getPurchasedTitleIds(profile.id),
    pointTransactionRepository.countByReason(profile.id, PointReason.RUNNER_UP),
  ]);
  const unlockedTitleIds = Array.from(
    new Set([
      ...getUnlockedTitleIds(
        TITLES.map((t) => t.id),
        titleStats,
      ),
      ...purchasedTitleIds,
    ]),
  );

  const progress = getLeagueProgress(profile.totalPoints, leagues);
  const frame = resolveFrameTier(profile.totalPoints, FRAME_TIERS);
  const nextFrame = resolveNextFrameTier(profile.totalPoints, FRAME_TIERS);
  const winRate = calculateWinRate(profile.totalWins, profile.totalMatches);
  const background =
    equippedItems.find((item) => item.id === profile.selectedBackgroundId) ??
    null;
  const badge =
    equippedItems.find((item) => item.id === profile.selectedBadgeId) ?? null;

  return {
    id: profile.id,
    displayName: profile.displayName,
    totalPoints: profile.totalPoints,
    prizeCurrency: profile.prizeCurrency,
    lifetimePrizeCurrency: profile.lifetimePrizeCurrency,
    totalMatches: profile.totalMatches,
    totalWins: profile.totalWins,
    totalLosses: profile.totalLosses,
    winRate,
    currentWinStreak: profile.currentWinStreak,
    bestWinStreak: profile.bestWinStreak,
    tournamentEntries: profile.tournamentEntries,
    tournamentWins: profile.tournamentWins,
    finalsReached: profile.finalsReached,
    runnerUpCount,
    selectedTitleId: profile.selectedTitleId,
    unlockedTitleIds,
    selectedFrameId: profile.selectedFrameId,
    selectedBackgroundId: profile.selectedBackgroundId,
    selectedBadgeId: profile.selectedBadgeId,
    selectedAvatarIconId: profile.selectedAvatarIconId,
    customAvatarUrl: profile.customAvatarUrl,
    showBotTag: profile.showBotTag,
    reducedMotion: profile.reducedMotion,
    soundEnabled: profile.soundEnabled,
    bgmEnabled: profile.bgmEnabled,
    vibrationEnabled: profile.vibrationEnabled,
    league: {
      current: progress.currentLeague,
      next: progress.nextLeague,
      pointsToNext: progress.pointsToNext,
      progressRatio: progress.progressRatio,
    },
    highestLeague: profile.highestLeague
      ? {
          id: profile.highestLeague.id,
          displayName: profile.highestLeague.displayName,
          themeKey: profile.highestLeague.themeKey,
          reachedAt: profile.highestLeagueAt,
        }
      : null,
    frame: { current: frame, next: nextFrame },
    background: background
      ? { assetKey: background.assetKey, name: background.name }
      : null,
    badge: badge ? { assetKey: badge.assetKey, name: badge.name } : null,
    trophies: trophies.map((t) => ({
      leagueId: t.leagueId,
      leagueName: t.league.displayName,
      leagueThemeKey: t.league.themeKey,
      count: t.count,
      firstWonAt: t.firstWonAt,
    })),
  };
}

export async function getMyGameStats(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile)
    throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const stats = await playerProfileRepository.listGameStats(profile.id);
  return stats.map((s) => ({
    gameTypeId: s.gameTypeId,
    gameName: s.gameType.name,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    winRate: calculateWinRate(s.wins, s.matches),
  }));
}

/** Full achievement catalog (locked + unlocked) for the profile screen. Locked entries marked
 * `hidden` in config come back with name/description/progress stripped so the secret stays a
 * secret until the player actually earns it — see domain/services/achievement-check.service.ts. */
export async function getMyAchievementCatalog(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile)
    throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const [unlockedRows, distinctGamesPlayed] = await Promise.all([
    playerProfileRepository.listAchievements(profile.id),
    playerGameStatsRepository.countDistinctGamesPlayed(profile.id),
  ]);
  const unlockedByCode = new Map(
    unlockedRows.map((row) => [row.achievement.code, row]),
  );

  const stats: AchievementCheckStats = {
    totalMatches: profile.totalMatches,
    totalWins: profile.totalWins,
    bestWinStreak: profile.bestWinStreak,
    finalsReached: profile.finalsReached,
    tournamentWins: profile.tournamentWins,
    tournamentEntries: profile.tournamentEntries,
    totalPoints: profile.totalPoints,
    distinctGamesPlayed,
    loginBonusStreak: profile.loginBonusStreak,
    lifetimePrizeCurrency: profile.lifetimePrizeCurrency,
  };

  return ACHIEVEMENTS.map((config) => {
    const unlockedRow = unlockedByCode.get(config.code);
    const unlocked = Boolean(unlockedRow);
    const isSecret = Boolean(config.hidden) && !unlocked;

    return {
      code: config.code,
      hidden: isSecret,
      unlocked,
      unlockedAt: unlockedRow?.unlockedAt ?? null,
      name: isSecret ? null : config.name,
      description: isSecret ? null : config.description,
      rewardPoints: isSecret ? null : config.rewardPoints,
      progress: isSecret
        ? null
        : Math.min(
            getAchievementProgress(config, stats),
            config.conditionValue,
          ),
      target: isSecret ? null : config.conditionValue,
    };
  });
}

export async function getMyPointHistory(
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile)
    throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return playerProfileRepository.listPointHistory(profile.id, cursor, limit);
}
