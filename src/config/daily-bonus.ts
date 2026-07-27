export interface DailyBonusTier {
  /** 1-7 — the streak day this tier pays out for. */
  day: number;
  points: number;
  prizeCurrency: number;
}

/**
 * ログインボーナス — a 7-day cycle that wraps back to day 1 after day 7. Flat amounts, not
 * scaled by league rewardMultiplier (see features/points/award-points.service.ts's
 * overrideAmount) — this is a retention reward, not a competitive-performance one.
 */
export const DAILY_BONUS_TIERS: DailyBonusTier[] = [
  { day: 1, points: 15, prizeCurrency: 0 },
  { day: 2, points: 15, prizeCurrency: 0 },
  { day: 3, points: 20, prizeCurrency: 50 },
  { day: 4, points: 20, prizeCurrency: 0 },
  { day: 5, points: 25, prizeCurrency: 0 },
  { day: 6, points: 25, prizeCurrency: 50 },
  { day: 7, points: 60, prizeCurrency: 200 },
];

export function getDailyBonusTier(streakDay: number): DailyBonusTier {
  const index = (streakDay - 1) % DAILY_BONUS_TIERS.length;
  return DAILY_BONUS_TIERS[index];
}
