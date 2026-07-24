import type { GameState, PlayerAction } from "@/domain/interfaces/psychological-game";
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

export interface NumberBluffState extends GameState {
  gameId: "number-bluff";
  participantIds: [string, string];
  phase: "DECLARE" | "RESPOND";
  pendingDeclarations: Record<string, NumberBluffDeclareAction>;
  pendingResponses: Record<string, NumberBluffRespondAction>;
  tiebreakApplied?: boolean;
}
