import type {
  GameState,
  PlayerAction,
  RoundRecord,
} from "@/domain/interfaces/psychological-game";

export type MinorityChoiceOption = "A" | "B";

export interface MinorityChoiceActionData {
  choice: MinorityChoiceOption;
}

export type MinorityChoiceDeclareAction =
  PlayerAction<MinorityChoiceActionData> & { actionType: "DECLARE" };
export type MinorityChoiceChooseAction =
  PlayerAction<MinorityChoiceActionData> & { actionType: "CHOOSE" };
export type MinorityChoiceAction =
  MinorityChoiceDeclareAction | MinorityChoiceChooseAction;

export interface CrowdResult {
  aCount: number;
  bCount: number;
}

/** The published portion of the round's crowd vote (see scoring.ts's crowdPreview) — public
 * information both players see BEFORE declaring, turning the round into a vote-counting +
 * opponent-prediction problem instead of a blind guess at an invisible crowd. */
export interface CrowdPreview {
  revealedA: number;
  revealedB: number;
  hiddenCount: number;
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
  /** Filled at each round's start (initialize / round advance). Optional because sessions
   * persisted before this field existed resume without it — consumers must fall back to
   * recomputing via crowdPreview(simulateCrowd(...)), which is deterministic and identical. */
  crowdPreviewByRound?: Record<number, CrowdPreview>;
  tiebreakApplied?: boolean;
  history: MinorityChoiceRoundRecord[];
}
