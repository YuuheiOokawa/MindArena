import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { leagueTrophyRepository } from "@/infrastructure/repositories/league-trophy.repository";
import { cosmeticItemRepository } from "@/infrastructure/repositories/cosmetic-item.repository";
import { getLeagueProgress } from "@/domain/services/league-progress.service";
import { resolveFrameTier, resolveNextFrameTier } from "@/domain/services/profile-decoration.service";
import { getUnlockedTitleIds } from "@/domain/services/title-unlock.service";
import { calculateWinRate } from "@/domain/services/win-rate.util";
import { computeTitleUnlockStats } from "./title-unlock-stats";
import { FRAME_TIERS } from "@/config/frames";
import { TITLES } from "@/config/titles";
import { AppError } from "@/lib/errors/app-error";

export async function getMyProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const equippedIds = [profile.selectedBackgroundId, profile.selectedBadgeId].filter((id): id is string => Boolean(id));
  const [leagues, trophies, equippedItems, titleStats] = await Promise.all([
    leagueRepository.findAllActive(),
    leagueTrophyRepository.listForPlayer(profile.id),
    equippedIds.length > 0 ? cosmeticItemRepository.findManyByIds(equippedIds) : Promise.resolve([]),
    computeTitleUnlockStats(profile),
  ]);
  const unlockedTitleIds = getUnlockedTitleIds(TITLES.map((t) => t.id), titleStats);

  const progress = getLeagueProgress(profile.totalPoints, leagues);
  const frame = resolveFrameTier(profile.totalPoints, FRAME_TIERS);
  const nextFrame = resolveNextFrameTier(profile.totalPoints, FRAME_TIERS);
  const winRate = calculateWinRate(profile.totalWins, profile.totalMatches);
  const background = equippedItems.find((item) => item.id === profile.selectedBackgroundId) ?? null;
  const badge = equippedItems.find((item) => item.id === profile.selectedBadgeId) ?? null;

  return {
    id: profile.id,
    displayName: profile.displayName,
    totalPoints: profile.totalPoints,
    prizeCurrency: profile.prizeCurrency,
    totalMatches: profile.totalMatches,
    totalWins: profile.totalWins,
    totalLosses: profile.totalLosses,
    winRate,
    currentWinStreak: profile.currentWinStreak,
    bestWinStreak: profile.bestWinStreak,
    tournamentEntries: profile.tournamentEntries,
    tournamentWins: profile.tournamentWins,
    finalsReached: profile.finalsReached,
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
    frame: { current: frame, next: nextFrame },
    background: background ? { assetKey: background.assetKey, name: background.name } : null,
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
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

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

export async function getMyAchievements(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return playerProfileRepository.listAchievements(profile.id);
}

export async function getMyPointHistory(userId: string, cursor?: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return playerProfileRepository.listPointHistory(profile.id, cursor);
}
