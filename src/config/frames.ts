import type { FrameTier } from "@/domain/services/profile-decoration.service";

/** Profile frame tiers unlocked purely by totalPoints. Boundaries are data, not JSX conditionals. */
export const FRAME_TIERS: FrameTier[] = [
  { id: "simple", code: "SIMPLE", name: "シンプルフレーム", minPoints: 0, glowIntensity: "none" },
  { id: "bronze", code: "BRONZE_FRAME", name: "ブロンズフレーム", minPoints: 500, glowIntensity: "subtle" },
  { id: "silver", code: "SILVER_FRAME", name: "シルバーフレーム", minPoints: 1500, glowIntensity: "subtle" },
  { id: "gold", code: "GOLD_FRAME", name: "ゴールドフレーム", minPoints: 3500, glowIntensity: "medium" },
  { id: "platinum", code: "PLATINUM_FRAME", name: "プラチナフレーム", minPoints: 7000, glowIntensity: "medium" },
  { id: "legend", code: "LEGEND_FRAME", name: "レジェンドフレーム", minPoints: 12000, glowIntensity: "strong" },
];
