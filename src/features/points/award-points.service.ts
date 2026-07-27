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
    /** Bypasses the league-multiplier calculation for flat, non-scaling grants (e.g. an
     * achievement's fixed reward — see config/achievements.ts). */
    overrideAmount?: number;
  },
) {
  const amount = params.overrideAmount ?? calculateReward(params.reason, params.league);
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

  await syncCurrentLeague(tx, params.playerProfileId, ledger.balanceAfter);

  return ledger;
}

/**
 * `currentLeagueId` is otherwise only ever set once, at registration (see register.service.ts) —
 * nothing previously kept it in sync with totalPoints as a player actually progressed, so
 * anywhere it was trusted directly (friend-challenge league selection, league badges on friend/
 * opponent cards) would silently show/use a player's STARTING league forever. Every point award
 * is exactly the moment totalPoints can cross a league threshold, so recomputing here keeps it
 * accurate going forward for every profile without needing a background job.
 */
async function syncCurrentLeague(tx: Tx, playerProfileId: string, totalPoints: number) {
  const league = await tx.league.findFirst({
    where: { isActive: true, requiredPoints: { lte: totalPoints } },
    orderBy: { requiredPoints: "desc" },
  });
  if (!league) return;
  await tx.playerProfile.updateMany({
    where: { id: playerProfileId, currentLeagueId: { not: league.id } },
    data: { currentLeagueId: league.id },
  });
}
