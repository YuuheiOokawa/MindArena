import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const playerGameStatsRepository = {
  async countDistinctGamesPlayed(playerProfileId: string) {
    return prisma.playerGameStats.count({ where: { playerProfileId, matches: { gt: 0 } } });
  },

  async recordMatch(tx: Tx, playerProfileId: string, gameTypeId: string, won: boolean) {
    return tx.playerGameStats.upsert({
      where: { playerProfileId_gameTypeId: { playerProfileId, gameTypeId } },
      create: {
        playerProfileId,
        gameTypeId,
        matches: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
      },
      update: {
        matches: { increment: 1 },
        wins: won ? { increment: 1 } : undefined,
        losses: won ? undefined : { increment: 1 },
      },
    });
  },
};
