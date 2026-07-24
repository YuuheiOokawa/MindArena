import type { GameState, PlayerAction } from "@/domain/interfaces/psychological-game";

/**
 * Abstraction over how a client learns about the opponent's moves. The MVP implementation
 * polls a Route Handler; a future WebSocket/Supabase Realtime implementation satisfies the
 * same contract so `features/games/core/use-game-session.ts` never has to change.
 */
export interface MatchChannel {
  sendAction(action: PlayerAction): Promise<void>;
  /** Returns the latest redacted state visible to the requesting participant. */
  pollState(): Promise<GameState>;
  /** Optional push-style subscription; long-poll implementations may no-op and rely on pollState. */
  subscribe?(onUpdate: (state: GameState) => void): () => void;
}
