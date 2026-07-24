import type { GameState, PlayerAction } from "@/domain/interfaces/psychological-game";

export type TrustOrBetrayChoice = "TRUST" | "BETRAY";

export interface TrustOrBetrayActionData {
  choice: TrustOrBetrayChoice;
}

export type TrustOrBetrayAction = PlayerAction<TrustOrBetrayActionData> & { actionType: "CHOOSE" };

export interface TrustOrBetrayState extends GameState {
  gameId: "trust-or-betray";
  participantIds: [string, string];
  pendingActions: Record<string, TrustOrBetrayAction>;
  tiebreakApplied?: boolean;
}
