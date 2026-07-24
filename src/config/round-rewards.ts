import { PointReason } from "@/domain/enums";

/** Which PointReason a participant earns for clearing a given tournament round (1-indexed). Round 5 (the final) is special-cased as CHAMPION/RUNNER_UP, not listed here. */
export const ROUND_CLEAR_REASON: Record<number, PointReason> = {
  1: PointReason.ROUND_1_CLEAR,
  2: PointReason.ROUND_2_CLEAR,
  3: PointReason.QUARTERFINAL_CLEAR,
  4: PointReason.SEMIFINAL_CLEAR,
};
