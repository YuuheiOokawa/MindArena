import type { FinalPredictionMove } from "./types";

/** STRIKE beats READ, READ beats GUARD, GUARD beats STRIKE (source spec §9 game 4). */
const BEATS: Record<FinalPredictionMove, FinalPredictionMove> = {
  STRIKE: "READ",
  READ: "GUARD",
  GUARD: "STRIKE",
};

export function scoreRound(moveA: FinalPredictionMove, moveB: FinalPredictionMove): { scoreA: number; scoreB: number } {
  if (moveA === moveB) return { scoreA: 0, scoreB: 0 };
  if (BEATS[moveA] === moveB) return { scoreA: 1, scoreB: 0 };
  return { scoreA: 0, scoreB: 1 };
}
