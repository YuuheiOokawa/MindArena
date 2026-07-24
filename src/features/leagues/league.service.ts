import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { getLeagueProgress, getUnlockedLeagues } from "@/domain/services/league-progress.service";
import { GAME_CATALOG } from "@/config/games";
import { AppError } from "@/lib/errors/app-error";

export async function listLeaguesWithUnlockStatus(points: number) {
  const leagues = await leagueRepository.findAllActive();
  const unlockedIds = new Set(getUnlockedLeagues(points, leagues).map((l) => l.id));
  return leagues.map((league) => ({ ...league, unlocked: unlockedIds.has(league.id) }));
}

export async function getMyLeagueProgress(points: number) {
  const leagues = await leagueRepository.findAllActive();
  return getLeagueProgress(points, leagues);
}

export async function getLeagueDetail(leagueId: string, points: number) {
  const league = await leagueRepository.findById(leagueId);
  if (!league || !league.isActive) throw new AppError("NOT_FOUND", "リーグが見つかりません。");

  return {
    ...league,
    unlocked: points >= league.requiredPoints,
    games: GAME_CATALOG,
  };
}
