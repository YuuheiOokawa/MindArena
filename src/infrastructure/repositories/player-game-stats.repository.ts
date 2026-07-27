import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const playerGameStatsRepository = {
  // `tx` defaults to the module client so existing out-of-transaction callers are unaffected;
  // pass the active transaction when checking this in the same tx that just called recordMatch,
  // otherwise a fresh game-type row's count can be read before that write is visible.
  async countDistinctGamesPlayed(playerProfileId: string, tx: Tx = prisma) {
    return tx.playerGameStats.count({ where: { playerProfileId, matches: { gt: 0 } } });
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
