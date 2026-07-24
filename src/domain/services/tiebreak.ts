import type { GameState } from "@/domain/interfaces/psychological-game";

/**
 * Default draw-resolution policy shared by every game's resolveTiebreak: play one more
 * "sudden death" round via the game's own logic first; only if the source spec's own
 * calculateResult still reports a draw after that does the caller fall back to a server-side
 * coin flip. This file only provides the coin flip — the "play one more round" part happens
 * inside each game's resolveTiebreak because only the game knows how to play a round of itself.
 */
export function coinFlip(random: () => number, participantIds: [string, string]): string {
  return random() < 0.5 ? participantIds[0] : participantIds[1];
}

interface TiebreakableState extends GameState {
  tiebreakApplied?: boolean;
}

/**
 * Extends a COMPLETE-but-drawn state by one extra round, played through the normal action
 * flow. Only ever applies once — a second draw after the sudden-death round falls back to
 * coinFlip at the call site (tournament finalization), not to an infinite extension loop.
 */
export function extendForSuddenDeath<TState extends TiebreakableState>(state: TState): TState {
  if (state.status !== "COMPLETE" || state.tiebreakApplied) return state;
  return {
    ...state,
    totalRounds: state.totalRounds + 1,
    status: "IN_PROGRESS",
    tiebreakApplied: true,
  };
}
