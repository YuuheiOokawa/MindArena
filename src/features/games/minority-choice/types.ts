import type { GameState, PlayerAction, RoundRecord } from "@/domain/interfaces/psychological-game";

export type MinorityChoiceOption = "A" | "B";

export interface MinorityChoiceActionData {
  choice: MinorityChoiceOption;
}

export type MinorityChoiceDeclareAction = PlayerAction<MinorityChoiceActionData> & { actionType: "DECLARE" };
export type MinorityChoiceChooseAction = PlayerAction<MinorityChoiceActionData> & { actionType: "CHOOSE" };
export type MinorityChoiceAction = MinorityChoiceDeclareAction | MinorityChoiceChooseAction;

export interface CrowdResult {
  aCount: number;
  bCount: number;
}

/** Adds the round's declared (public, possibly-bluffed) choices alongside the base `actions`
 * (final locked-in choices), so the post-round reveal can show who bluffed. */
export interface MinorityChoiceRoundRecord extends RoundRecord {
  declarations: Record<string, MinorityChoiceDeclareAction>;
}

export interface MinorityChoiceState extends GameState {
  gameId: "minority-choice";
  participantIds: [string, string];
  phase: "DECLARE" | "CHOOSE";
  /**
   * The round's live declarations — deliberately NOT one of redaction.ts's redacted bucket keys
   * (unlike pendingActions), so each side's declared choice is visible to the opponent as soon as
   * it's submitted. Can be a lie: the final CHOOSE action is independent and may differ.
   */
  declarations: Record<string, MinorityChoiceDeclareAction>;
  pendingActions: Record<string, MinorityChoiceChooseAction>;
  crowdByRound: Record<number, CrowdResult>;
  tiebreakApplied?: boolean;
  history: MinorityChoiceRoundRecord[];
}
