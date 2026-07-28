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
    round?: number;
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
    round: params.round,
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
 *
 * Also maintains `highestLeagueId`/`highestLeagueAt` — the highest league this player has EVER
 * reached. Distinct from currentLeagueId, which can now go DOWN (elimination penalties can drop
 * totalPoints below a league's threshold — see config/points.ts's ROUND_*_ELIMINATION entries),
 * so "highest ever" needs its own high-water-mark tracking rather than being derivable from
 * totalPoints/currentLeagueId alone.
 */
async function syncCurrentLeague(tx: Tx, playerProfileId: string, totalPoints: number) {
  const league = await tx.league.findFirst({
    where: { isActive: true, requiredPoints: { lte: totalPoints } },
    orderBy: { requiredPoints: "desc" },
  });
  if (!league) return;

  const profile = await tx.playerProfile.findUniqueOrThrow({
    where: { id: playerProfileId },
    select: { currentLeagueId: true, highestLeague: { select: { displayOrder: true } } },
  });

  const data: { currentLeagueId?: string; highestLeagueId?: string; highestLeagueAt?: Date } = {};
  if (profile.currentLeagueId !== league.id) data.currentLeagueId = league.id;
  if (!profile.highestLeague || league.displayOrder > profile.highestLeague.displayOrder) {
    data.highestLeagueId = league.id;
    data.highestLeagueAt = new Date();
  }
  if (Object.keys(data).length === 0) return;

  await tx.playerProfile.update({ where: { id: playerProfileId }, data });
}
