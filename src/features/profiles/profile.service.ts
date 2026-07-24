import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { getLeagueProgress } from "@/domain/services/league-progress.service";
import { resolveFrameTier, resolveNextFrameTier } from "@/domain/services/profile-decoration.service";
import { calculateWinRate } from "@/domain/services/win-rate.util";
import { FRAME_TIERS } from "@/config/frames";
import { AppError } from "@/lib/errors/app-error";

export async function getMyProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const leagues = await leagueRepository.findAllActive();
  const progress = getLeagueProgress(profile.totalPoints, leagues);
  const frame = resolveFrameTier(profile.totalPoints, FRAME_TIERS);
  const nextFrame = resolveNextFrameTier(profile.totalPoints, FRAME_TIERS);
  const winRate = calculateWinRate(profile.totalWins, profile.totalMatches);

  return {
    id: profile.id,
    displayName: profile.displayName,
    totalPoints: profile.totalPoints,
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
    selectedFrameId: profile.selectedFrameId,
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
