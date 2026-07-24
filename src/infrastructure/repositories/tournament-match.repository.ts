import { prisma } from "@/infrastructure/database/prisma";
import { MatchStatus } from "@/domain/enums";
import type { Prisma } from "@/generated/prisma/client";

export interface NewMatch {
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1ParticipantId: string;
  player2ParticipantId: string;
  gameTypeId: string;
}

export const tournamentMatchRepository = {
  async createMany(matches: NewMatch[]) {
    await prisma.tournamentMatch.createMany({
      data: matches.map((m) => ({ ...m, status: MatchStatus.READY })),
    });
  },

  async listForRound(tournamentId: string, round: number) {
    return prisma.tournamentMatch.findMany({
      where: { tournamentId, round },
      orderBy: { matchNumber: "asc" },
      include: { player1: true, player2: true, winner: true, result: true },
    });
  },

  async listForTournament(tournamentId: string) {
    return prisma.tournamentMatch.findMany({
      where: { tournamentId },
      orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      include: { player1: true, player2: true, winner: true, result: true },
    });
  },

  async findById(id: string) {
    return prisma.tournamentMatch.findUniqueOrThrow({
      where: { id },
      include: { player1: true, player2: true, winner: true, gameType: true, tournament: true },
    });
  },

  async findForPlayer(tournamentId: string, participantId: string) {
    return prisma.tournamentMatch.findFirst({
      where: {
        tournamentId,
        status: { in: [MatchStatus.READY, MatchStatus.IN_PROGRESS] },
        OR: [{ player1ParticipantId: participantId }, { player2ParticipantId: participantId }],
      },
      include: { player1: true, player2: true, gameType: true },
    });
  },

  async update(id: string, data: Prisma.TournamentMatchUpdateInput) {
    return prisma.tournamentMatch.update({ where: { id }, data });
  },
};
