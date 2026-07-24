import type { PlayerAction } from "@/domain/interfaces/psychological-game";

/**
 * Shared helper for the common "both sides submit one action per round, simultaneously"
 * shape used by Trust or Betray, Minority Choice, and Final Prediction. Number Bluff uses it
 * twice per round (declare phase, then respond phase) since it has two sub-phases.
 */
export function submitSimultaneousAction<A extends PlayerAction>(
  pendingActions: Record<string, A>,
  action: A,
  participantIds: [string, string],
): { pendingActions: Record<string, A>; bothSubmitted: boolean } {
  if (pendingActions[action.participantId]) {
    throw new Error("この選択はすでに送信されています。");
  }
  if (!participantIds.includes(action.participantId)) {
    throw new Error("この対戦の参加者ではありません。");
  }

  const next = { ...pendingActions, [action.participantId]: action };
  const bothSubmitted = participantIds.every((id) => Boolean(next[id]));
  return { pendingActions: next, bothSubmitted };
}

export function otherParticipant(participantIds: [string, string], participantId: string): string {
  const other = participantIds.find((id) => id !== participantId);
  if (!other) throw new Error("相手の参加者が見つかりません。");
  return other;
}
