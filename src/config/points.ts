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
  // Elimination penalties (負の値) — earlier exits cost more. Round 4 (semifinal, "ベスト4"
  // finish) is deliberately not represented here: no PointReason exists for it, so no penalty
  // can ever be applied at that stage. Scaled by the same league.rewardMultiplier as every other
  // reason (domain/services/points.service.ts), so higher leagues lose more per elimination —
  // the same knob that already makes higher leagues earn more per round survived.
  [PointReason.ROUND_1_ELIMINATION]: -20,
  [PointReason.ROUND_2_ELIMINATION]: -12,
  [PointReason.QUARTERFINAL_ELIMINATION]: -6,
  [PointReason.ACHIEVEMENT_BONUS]: 0, // amount is supplied per-achievement, see config/achievements.ts
  [PointReason.DAILY_BONUS]: 0, // amount is supplied per-day-tier, see config/daily-bonus.ts
  [PointReason.ADMIN_ADJUSTMENT]: 0, // amount is supplied by the admin action itself
};

/**
 * 賞金 (prizeCurrency) awarded for winning a tournament, before the league's rewardMultiplier —
 * same scaling shape as BASE_POINT_REWARDS, but a distinct spendable wallet (see
 * PlayerProfile.prizeCurrency) meant for the shop, not the points ladder that drives league
 * placement.
 */
export const BASE_CHAMPION_PRIZE = 500;
