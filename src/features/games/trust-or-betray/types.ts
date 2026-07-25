import type { GameState, PlayerAction, RoundRecord } from "@/domain/interfaces/psychological-game";

export type TrustOrBetrayChoice = "TRUST" | "BETRAY";

export interface TrustOrBetrayActionData {
  choice: TrustOrBetrayChoice;
}

export type TrustOrBetrayDeclareAction = PlayerAction<TrustOrBetrayActionData> & { actionType: "DECLARE" };
export type TrustOrBetrayChooseAction = PlayerAction<TrustOrBetrayActionData> & { actionType: "CHOOSE" };
export type TrustOrBetrayAction = TrustOrBetrayDeclareAction | TrustOrBetrayChooseAction;

/** Adds the round's declared (public, possibly-bluffed) choices alongside the base `actions`
 * (final locked-in choices), so the post-round reveal can show who bluffed. */
export interface TrustOrBetrayRoundRecord extends RoundRecord {
  declarations: Record<string, TrustOrBetrayDeclareAction>;
}

export interface TrustOrBetrayState extends GameState {
  gameId: "trust-or-betray";
  participantIds: [string, string];
  phase: "DECLARE" | "CHOOSE";
  /**
   * The round's live declarations — deliberately NOT one of redaction.ts's redacted bucket keys
   * (unlike pendingActions), so each side's declared intent is visible to the opponent as soon as
   * it's submitted. Can be a lie: the final CHOOSE action is independent and may differ.
   */
  declarations: Record<string, TrustOrBetrayDeclareAction>;
  pendingActions: Record<string, TrustOrBetrayChooseAction>;
  tiebreakApplied?: boolean;
  history: TrustOrBetrayRoundRecord[];
}
