import type { GameState, PlayerAction, RoundRecord } from "@/domain/interfaces/psychological-game";
import type { NumberBluffDeclarationId } from "@/config/games/number-bluff";

export interface NumberBluffDeclareData {
  number: number;
  declarationId: NumberBluffDeclarationId;
}
export type NumberBluffDeclareAction = PlayerAction<NumberBluffDeclareData> & { actionType: "DECLARE" };

export interface NumberBluffRespondData {
  believe: boolean;
}
export type NumberBluffRespondAction = PlayerAction<NumberBluffRespondData> & { actionType: "RESPOND" };

export type NumberBluffAction = NumberBluffDeclareAction | NumberBluffRespondAction;

/** Adds the RESPOND actions alongside the base `actions` (DECLARE) map, so the post-round
 * reveal UI can show whether each side believed the other's declaration, not just the numbers. */
export interface NumberBluffRoundRecord extends RoundRecord {
  responses: Record<string, NumberBluffRespondAction>;
}

export interface NumberBluffState extends GameState {
  gameId: "number-bluff";
  participantIds: [string, string];
  phase: "DECLARE" | "RESPOND";
  pendingDeclarations: Record<string, NumberBluffDeclareAction>;
  pendingResponses: Record<string, NumberBluffRespondAction>;
  history: NumberBluffRoundRecord[];
  tiebreakApplied?: boolean;
}
