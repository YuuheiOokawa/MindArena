import type { GameState, PlayerAction } from "@/domain/interfaces/psychological-game";

export type FinalPredictionMove = "STRIKE" | "GUARD" | "READ";

export interface FinalPredictionActionData {
  move: FinalPredictionMove;
}

export type FinalPredictionAction = PlayerAction<FinalPredictionActionData> & { actionType: "CHOOSE" };

export interface FinalPredictionState extends GameState {
  gameId: "final-prediction";
  participantIds: [string, string];
  pendingActions: Record<string, FinalPredictionAction>;
  tiebreakApplied?: boolean;
}
