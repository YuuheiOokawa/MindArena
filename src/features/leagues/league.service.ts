import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import {
  getLeagueProgress,
  getUnlockedLeagues,
} from "@/domain/services/league-progress.service";
import { GAME_CATALOG } from "@/config/games";
import { isLeagueVisible } from "@/config/leagues";
import { AppError } from "@/lib/errors/app-error";

/** 裏リーグ concealment (config/leagues.ts's HIDDEN_LEAGUE_CODES): every league listing runs
 * through this so a hidden league simply does not exist for players below the reveal threshold. */
export async function listVisibleLeagues(points: number) {
  const leagues = await leagueRepository.findAllActive();
  return leagues.filter((league) => isLeagueVisible(league.code, points));
}

export async function listLeaguesWithUnlockStatus(points: number) {
  const leagues = await listVisibleLeagues(points);
  const unlockedIds = new Set(
    getUnlockedLeagues(points, leagues).map((l) => l.id),
  );
  return leagues.map((league) => ({
    ...league,
    unlocked: unlockedIds.has(league.id),
  }));
}

export async function getMyLeagueProgress(points: number) {
  const leagues = await leagueRepository.findAllActive();
  return getLeagueProgress(points, leagues);
}

export async function getLeagueDetail(leagueId: string, points: number) {
  const league = await leagueRepository.findById(leagueId);
  if (!league || !league.isActive)
    throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  // A hidden league's detail page 404s (not 403s) below the reveal threshold — its existence is
  // the secret, so the response must be indistinguishable from a league that isn't there.
  if (!isLeagueVisible(league.code, points))
    throw new AppError("NOT_FOUND", "リーグが見つかりません。");

  return {
    ...league,
    unlocked: points >= league.requiredPoints,
    games: GAME_CATALOG,
  };
}
