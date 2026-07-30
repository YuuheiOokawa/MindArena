import { prisma } from "@/infrastructure/database/prisma";
import type { PointReason } from "@/domain/enums";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const pointTransactionRepository = {
  async record(
    tx: Tx,
    data: {
      playerProfileId: string;
      amount: number;
      reason: PointReason;
      tournamentId?: string;
      leagueId?: string;
      round?: number;
      balanceBefore: number;
      balanceAfter: number;
    },
  ) {
    return tx.pointTransaction.create({ data });
  },

  async listForProfile(playerProfileId: string, cursor?: string, limit = 20) {
    return prisma.pointTransaction.findMany({
      where: { playerProfileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  },

  /** 準優勝回数 etc. — stats not tracked as PlayerProfile columns are derivable from the ledger,
   * since every RUNNER_UP award writes exactly one transaction (progress.service.ts). */
  async countByReason(playerProfileId: string, reason: PointReason) {
    return prisma.pointTransaction.count({ where: { playerProfileId, reason } });
  },
};
