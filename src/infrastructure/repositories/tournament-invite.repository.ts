import { prisma } from "@/infrastructure/database/prisma";
import { TournamentInviteStatus } from "@/domain/enums";

const PROFILE_CARD_SELECT = {
  id: true,
  displayName: true,
  totalPoints: true,
  selectedTitleId: true,
  selectedFrameId: true,
  currentLeague: { select: { code: true, displayName: true } },
} as const;

export const tournamentInviteRepository = {
  async createMany(tournamentId: string, inviterId: string, inviteeIds: string[]) {
    if (inviteeIds.length === 0) return;
    await prisma.tournamentInvite.createMany({
      data: inviteeIds.map((inviteeId) => ({ tournamentId, inviterId, inviteeId })),
      skipDuplicates: true,
    });
  },

  async findById(id: string) {
    return prisma.tournamentInvite.findUnique({ where: { id } });
  },

  async accept(id: string) {
    return prisma.tournamentInvite.update({ where: { id }, data: { status: TournamentInviteStatus.ACCEPTED } });
  },

  async decline(id: string) {
    return prisma.tournamentInvite.update({ where: { id }, data: { status: TournamentInviteStatus.DECLINED } });
  },

  /** Marks every still-PENDING invite for a tournament as EXPIRED once it finalizes (BOT-fills
   * and starts) — a friend who never responded shouldn't keep seeing a stale "join now" prompt. */
  async expireAllPending(tournamentId: string) {
    await prisma.tournamentInvite.updateMany({
      where: { tournamentId, status: TournamentInviteStatus.PENDING },
      data: { status: TournamentInviteStatus.EXPIRED },
    });
  },

  async listIncomingPending(inviteeId: string) {
    return prisma.tournamentInvite.findMany({
      where: { inviteeId, status: TournamentInviteStatus.PENDING },
      include: {
        inviter: { select: PROFILE_CARD_SELECT },
        tournament: { select: { id: true, status: true, maxPlayers: true, league: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async countPendingForTournament(tournamentId: string) {
    return prisma.tournamentInvite.count({ where: { tournamentId, status: TournamentInviteStatus.PENDING } });
  },
};
