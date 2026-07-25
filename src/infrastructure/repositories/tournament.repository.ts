import { prisma } from "@/infrastructure/database/prisma";
import { ParticipantStatus, TournamentStatus } from "@/domain/enums";
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

  /** A tournament only counts as "active" for a player while they still have a live seat in it —
   * once eliminated (or withdrawn/a bye that never played), they're free to join/start something
   * else even while the rest of that bracket plays on. Filtering on the tournament's status alone
   * would otherwise lock an eliminated player out of everything until the ENTIRE original bracket
   * finishes, sometimes rounds later. */
  async findActiveForPlayer(playerId: string) {
    return prisma.tournament.findFirst({
      where: {
        status: { in: [TournamentStatus.RECRUITING, TournamentStatus.READY, TournamentStatus.IN_PROGRESS] },
        participants: { some: { playerId, status: ParticipantStatus.ACTIVE } },
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
