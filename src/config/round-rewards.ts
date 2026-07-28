import { PointReason } from "@/domain/enums";

/** Which PointReason a participant earns for clearing a given tournament round (1-indexed). Round 5 (the final) is special-cased as CHAMPION/RUNNER_UP, not listed here. */
export const ROUND_CLEAR_REASON: Record<number, PointReason> = {
  1: PointReason.ROUND_1_CLEAR,
  2: PointReason.ROUND_2_CLEAR,
  3: PointReason.QUARTERFINAL_CLEAR,
  4: PointReason.SEMIFINAL_CLEAR,
};

/**
 * Which PointReason (a negative BASE_POINT_REWARDS entry — see config/points.ts) a participant
 * is penalized with for being ELIMINATED in a given round (1-indexed). Deliberately has no entry
 * for round 4: losing the semifinal is a "ベスト4" finish and is never penalized. Round 5 (the
 * final) losers earn RUNNER_UP instead — also never penalized, and not listed here.
 */
export const ROUND_ELIMINATION_REASON: Partial<Record<number, PointReason>> = {
  1: PointReason.ROUND_1_ELIMINATION,
  2: PointReason.ROUND_2_ELIMINATION,
  3: PointReason.QUARTERFINAL_ELIMINATION,
};

/** Human-readable "到達ラウンド" label for the match result screen — what round a win/loss at
 * this stage actually represents in tournament terms, independent of the point amount. */
export function describeRoundOutcome(round: number, won: boolean, isFinal: boolean): string {
  if (isFinal) return won ? "優勝" : "準優勝";
  const advancedTo: Record<number, string> = { 1: "ベスト16", 2: "ベスト8", 3: "ベスト4", 4: "決勝" };
  const eliminatedAt: Record<number, string> = { 1: "1回戦敗退（ベスト32）", 2: "ベスト16敗退", 3: "ベスト8敗退", 4: "ベスト4" };
  return won ? (advancedTo[round] ?? `ラウンド${round}突破`) : (eliminatedAt[round] ?? `ラウンド${round}敗退`);
}
