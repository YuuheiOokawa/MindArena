export type FinalPredictionMove = "STRIKE" | "GUARD" | "READ";

export const FINAL_PREDICTION_MOVE_LABELS: Record<FinalPredictionMove, { label: string; description: string }> = {
  STRIKE: { label: "攻撃", description: "見破るに勝つ" },
  GUARD: { label: "防御", description: "攻撃に勝つ" },
  READ: { label: "見破る", description: "防御に勝つ" },
};

/** STRIKE beats READ, READ beats GUARD, GUARD beats STRIKE (source spec §9 game 4). Mirrors scoring.ts's BEATS table. */
export const FINAL_PREDICTION_BEATS: Record<FinalPredictionMove, FinalPredictionMove> = {
  STRIKE: "READ",
  READ: "GUARD",
  GUARD: "STRIKE",
};
