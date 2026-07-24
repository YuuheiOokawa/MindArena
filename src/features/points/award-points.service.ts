import type { PointReason } from "@/domain/enums";
import { applyTransaction, calculateReward } from "@/domain/services/points.service";
import { pointTransactionRepository } from "@/infrastructure/repositories/point-transaction.repository";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * The ONLY place points are awarded (source spec §19 — server-authoritative rewards). Always
 * called from inside a Prisma transaction so the balance update and the ledger row are atomic.
 */
export async function awardPoints(
  tx: Tx,
  params: {
    playerProfileId: string;
    currentPoints: number;
    reason: PointReason;
    league: { rewardMultiplier: number };
    tournamentId?: string;
    leagueId?: string;
  },
) {
  const amount = calculateReward(params.reason, params.league);
  const ledger = applyTransaction(params.currentPoints, amount);

  await tx.playerProfile.update({ where: { id: params.playerProfileId }, data: { totalPoints: ledger.balanceAfter } });
  await pointTransactionRepository.record(tx, {
    playerProfileId: params.playerProfileId,
    amount,
    reason: params.reason,
    tournamentId: params.tournamentId,
    leagueId: params.leagueId,
    balanceBefore: ledger.balanceBefore,
    balanceAfter: ledger.balanceAfter,
  });

  return ledger;
}
