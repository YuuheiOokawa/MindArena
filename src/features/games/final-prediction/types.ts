import type { GameState, PlayerAction, RoundRecord } from "@/domain/interfaces/psychological-game";

export type FinalPredictionMove = "STRIKE" | "GUARD" | "READ";

export interface FinalPredictionActionData {
  move: FinalPredictionMove;
}

export type FinalPredictionDeclareAction = PlayerAction<FinalPredictionActionData> & { actionType: "DECLARE" };
export type FinalPredictionChooseAction = PlayerAction<FinalPredictionActionData> & { actionType: "CHOOSE" };
export type FinalPredictionAction = FinalPredictionDeclareAction | FinalPredictionChooseAction;

/** Adds the round's declared (public, possibly-bluffed) moves alongside the base `actions`
 * (final locked-in moves), so the post-round reveal can show who bluffed. */
export interface FinalPredictionRoundRecord extends RoundRecord {
  declarations: Record<string, FinalPredictionDeclareAction>;
}

export interface FinalPredictionState extends GameState {
  gameId: "final-prediction";
  participantIds: [string, string];
  phase: "DECLARE" | "CHOOSE";
  /**
   * The round's live declarations — deliberately NOT one of redaction.ts's redacted bucket keys
   * (unlike pendingActions), so each side's declared move is visible to the opponent as soon as
   * it's submitted. Can be a lie: the final CHOOSE action is independent and may differ, which is
   * what makes this a genuine read-the-read mind game instead of a blind 3-way coin flip.
   */
  declarations: Record<string, FinalPredictionDeclareAction>;
  pendingActions: Record<string, FinalPredictionChooseAction>;
  tiebreakApplied?: boolean;
  history: FinalPredictionRoundRecord[];
}
