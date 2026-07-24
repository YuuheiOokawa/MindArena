import { PointReason } from "@/domain/enums";

/**
 * Base point rewards before a league's rewardMultiplier is applied
 * (finalReward = baseReward * leagueMultiplier — see domain/services/points.service.ts).
 */
export const BASE_POINT_REWARDS: Record<PointReason, number> = {
  [PointReason.TOURNAMENT_ENTRY]: 10,
  [PointReason.ROUND_1_CLEAR]: 15,
  [PointReason.ROUND_2_CLEAR]: 25,
  [PointReason.QUARTERFINAL_CLEAR]: 40,
  [PointReason.SEMIFINAL_CLEAR]: 70,
  [PointReason.RUNNER_UP]: 120,
  [PointReason.CHAMPION]: 250,
  [PointReason.ACHIEVEMENT_BONUS]: 0, // amount is supplied per-achievement, see config/achievements.ts
  [PointReason.ADMIN_ADJUSTMENT]: 0, // amount is supplied by the admin action itself
};
