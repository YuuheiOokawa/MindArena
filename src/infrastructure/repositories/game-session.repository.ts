import { prisma } from "@/infrastructure/database/prisma";
import { GameSessionStatus } from "@/domain/enums";
import type { Prisma } from "@/generated/prisma/client";

export const gameSessionRepository = {
  async findByMatchId(tournamentMatchId: string) {
    return prisma.gameSession.findUnique({ where: { tournamentMatchId } });
  },

  async create(data: { tournamentMatchId: string; gameTypeId: string; state: Prisma.InputJsonValue }) {
    return prisma.gameSession.create({
      data: { ...data, status: GameSessionStatus.ACTIVE, currentRound: 1 },
    });
  },

  async updateState(id: string, state: Prisma.InputJsonValue, currentRound: number) {
    return prisma.gameSession.update({ where: { id }, data: { state, currentRound } });
  },

  async complete(id: string, state: Prisma.InputJsonValue) {
    return prisma.gameSession.update({
      where: { id },
      data: { state, status: GameSessionStatus.COMPLETED, completedAt: new Date() },
    });
  },

  /** A match resolved by forfeit/withdrawal rather than being genuinely played out — distinct
   * from `complete` so it's not confused with a real finish in any future stats/history view. */
  async abandon(id: string) {
    return prisma.gameSession.update({
      where: { id },
      data: { status: GameSessionStatus.ABANDONED, completedAt: new Date() },
    });
  },
};
