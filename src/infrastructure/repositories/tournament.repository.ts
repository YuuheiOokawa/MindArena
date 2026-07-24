import { prisma } from "@/infrastructure/database/prisma";
import { TournamentStatus } from "@/domain/enums";
import type { Prisma } from "@/generated/prisma/client";

export const tournamentRepository = {
  async findOpenForLeague(leagueId: string) {
    return prisma.tournament.findFirst({
      where: { leagueId, status: TournamentStatus.RECRUITING },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(leagueId: string, maxPlayers: number) {
    return prisma.tournament.create({ data: { leagueId, maxPlayers, status: TournamentStatus.RECRUITING } });
  },

  async findById(id: string) {
    return prisma.tournament.findUnique({
      where: { id },
      include: { league: true, participants: true },
    });
  },

  async update(id: string, data: Prisma.TournamentUpdateInput) {
    return prisma.tournament.update({ where: { id }, data });
  },

  async findActiveForPlayer(playerId: string) {
    return prisma.tournament.findFirst({
      where: {
        status: { in: [TournamentStatus.RECRUITING, TournamentStatus.READY, TournamentStatus.IN_PROGRESS] },
        participants: { some: { playerId } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Most recent tournament regardless of status — used by the resume flow so a just-finished
   * tournament (COMPLETED) can still resolve to the championship screen once. */
  async findLatestForPlayer(playerId: string) {
    return prisma.tournament.findFirst({
      where: { participants: { some: { playerId } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
