import type { PointReason } from "@/domain/enums";
import { BASE_POINT_REWARDS } from "@/config/points";

export interface LeagueMultiplierSource {
  rewardMultiplier: number;
}

/**
 * finalReward = baseReward * leagueMultiplier, rounded to the nearest whole point so the
 * ledger never stores fractional points.
 */
export function calculateReward(reason: PointReason, league: LeagueMultiplierSource): number {
  const base = BASE_POINT_REWARDS[reason];
  return Math.round(base * league.rewardMultiplier);
}

export interface PointLedgerEntry {
  balanceBefore: number;
  balanceAfter: number;
  amount: number;
}

/** Pure balance transition — the caller is responsible for persisting it inside a transaction. */
export function applyTransaction(currentBalance: number, amount: number): PointLedgerEntry {
  const balanceBefore = currentBalance;
  const balanceAfter = Math.max(0, balanceBefore + amount);
  return { balanceBefore, balanceAfter, amount };
}
