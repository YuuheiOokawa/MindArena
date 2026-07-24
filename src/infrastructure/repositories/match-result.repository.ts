import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const matchResultRepository = {
  async findByMatchId(tournamentMatchId: string) {
    return prisma.matchResult.findUnique({ where: { tournamentMatchId } });
  },

  /** Idempotent create — returns the existing row if a result already exists (source spec §19 double-reward guard). */
  async createIfAbsent(data: {
    tournamentMatchId: string;
    winnerParticipantId: string | null;
    loserParticipantId: string | null;
    player1Score: number;
    player2Score: number;
    resultData: Prisma.InputJsonValue;
  }) {
    const existing = await prisma.matchResult.findUnique({ where: { tournamentMatchId: data.tournamentMatchId } });
    if (existing) return { result: existing, alreadyExisted: true as const };
    const result = await prisma.matchResult.create({ data });
    return { result, alreadyExisted: false as const };
  },
};
