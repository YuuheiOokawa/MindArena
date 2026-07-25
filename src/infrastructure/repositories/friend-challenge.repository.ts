import { prisma } from "@/infrastructure/database/prisma";
import { FriendChallengeStatus } from "@/domain/enums";

const PROFILE_CARD_SELECT = {
  id: true,
  displayName: true,
  totalPoints: true,
  selectedTitleId: true,
  selectedFrameId: true,
  currentLeague: { select: { code: true, displayName: true } },
  user: { select: { username: true } },
} as const;

export const friendChallengeRepository = {
  async findPendingBetween(profileIdA: string, profileIdB: string) {
    return prisma.friendChallenge.findFirst({
      where: {
        status: FriendChallengeStatus.PENDING,
        OR: [
          { challengerId: profileIdA, opponentId: profileIdB },
          { challengerId: profileIdB, opponentId: profileIdA },
        ],
      },
    });
  },

  /** Upsert rather than a plain insert: `@@unique([challengerId, opponentId])` means a SECOND
   * challenge in the same direction would otherwise hit that constraint forever once the first
   * one resolves (DECLINED/ACCEPTED rows are kept, not deleted, for history) — re-challenging a
   * friend after a decline, or challenging them again after a previous match, must keep working. */
  async create(challengerId: string, opponentId: string) {
    return prisma.friendChallenge.upsert({
      where: { challengerId_opponentId: { challengerId, opponentId } },
      create: { challengerId, opponentId },
      update: { status: FriendChallengeStatus.PENDING, tournamentId: null, createdAt: new Date() },
    });
  },

  async findById(id: string) {
    return prisma.friendChallenge.findUnique({ where: { id } });
  },

  async accept(id: string, tournamentId: string) {
    return prisma.friendChallenge.update({
      where: { id },
      data: { status: FriendChallengeStatus.ACCEPTED, tournamentId },
    });
  },

  async decline(id: string) {
    return prisma.friendChallenge.update({ where: { id }, data: { status: FriendChallengeStatus.DECLINED } });
  },

  /** Declines any still-PENDING challenge between two profiles regardless of direction — called
   * when the friendship itself is removed, so accepting can't create a real tournament between
   * two accounts that are no longer friends. */
  async declineAllPendingBetween(profileIdA: string, profileIdB: string) {
    await prisma.friendChallenge.updateMany({
      where: {
        status: FriendChallengeStatus.PENDING,
        OR: [
          { challengerId: profileIdA, opponentId: profileIdB },
          { challengerId: profileIdB, opponentId: profileIdA },
        ],
      },
      data: { status: FriendChallengeStatus.DECLINED },
    });
  },

  async listIncoming(profileId: string) {
    return prisma.friendChallenge.findMany({
      where: { opponentId: profileId, status: FriendChallengeStatus.PENDING },
      include: { challenger: { select: PROFILE_CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });
  },

  async listOutgoing(profileId: string) {
    return prisma.friendChallenge.findMany({
      where: { challengerId: profileId, status: FriendChallengeStatus.PENDING },
      include: { opponent: { select: PROFILE_CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });
  },
};
