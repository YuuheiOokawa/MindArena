import type { GameState, PlayerAction } from "@/domain/interfaces/psychological-game";

export type MinorityChoiceOption = "A" | "B";

export interface MinorityChoiceActionData {
  choice: MinorityChoiceOption;
}

export type MinorityChoiceAction = PlayerAction<MinorityChoiceActionData> & { actionType: "CHOOSE" };

export interface CrowdResult {
  aCount: number;
  bCount: number;
}

export interface MinorityChoiceState extends GameState {
  gameId: "minority-choice";
  participantIds: [string, string];
  pendingActions: Record<string, MinorityChoiceAction>;
  crowdByRound: Record<number, CrowdResult>;
  tiebreakApplied?: boolean;
}
