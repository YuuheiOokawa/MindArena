import type { LeagueEntity } from "@/domain/entities";

export interface LeagueProgress {
  currentLeague: LeagueEntity;
  nextLeague: LeagueEntity | null;
  pointsIntoCurrent: number;
  pointsToNext: number | null;
  /** 0..1, clamped; 1 when there is no next league (already at the top). */
  progressRatio: number;
}

function sortedByRequirement(leagues: LeagueEntity[]): LeagueEntity[] {
  return [...leagues].sort((a, b) => a.requiredPoints - b.requiredPoints);
}

/** Every league whose requiredPoints threshold the given point total has reached. */
export function getUnlockedLeagues(points: number, leagues: LeagueEntity[]): LeagueEntity[] {
  return sortedByRequirement(leagues).filter((league) => points >= league.requiredPoints);
}

/** The highest league unlocked by the given point total. Assumes at least one league has requiredPoints 0. */
export function getCurrentLeague(points: number, leagues: LeagueEntity[]): LeagueEntity {
  const unlocked = getUnlockedLeagues(points, leagues);
  if (unlocked.length === 0) {
    throw new Error("League configuration must include a 0-point entry league.");
  }
  return unlocked[unlocked.length - 1];
}

export function getNextLeague(points: number, leagues: LeagueEntity[]): LeagueEntity | null {
  const ordered = sortedByRequirement(leagues);
  return ordered.find((league) => league.requiredPoints > points) ?? null;
}

export function getLeagueProgress(points: number, leagues: LeagueEntity[]): LeagueProgress {
  const currentLeague = getCurrentLeague(points, leagues);
  const nextLeague = getNextLeague(points, leagues);
  const pointsIntoCurrent = points - currentLeague.requiredPoints;

  if (!nextLeague) {
    return { currentLeague, nextLeague: null, pointsIntoCurrent, pointsToNext: null, progressRatio: 1 };
  }

  const span = nextLeague.requiredPoints - currentLeague.requiredPoints;
  const progressRatio = span <= 0 ? 1 : Math.min(1, Math.max(0, pointsIntoCurrent / span));

  return {
    currentLeague,
    nextLeague,
    pointsIntoCurrent,
    pointsToNext: Math.max(0, nextLeague.requiredPoints - points),
    progressRatio,
  };
}
