import { prisma } from "@/infrastructure/database/prisma";
import { FriendChallengeStatus } from "@/domain/enums";

const PROFILE_CARD_SELECT = {
  id: true,
  displayName: true,
  totalPoints: true,
  selectedTitleId: true,
  selectedFrameId: true,
  currentLeague: { select: { code: true, displayName: true } },
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

  async create(challengerId: string, opponentId: string) {
    return prisma.friendChallenge.create({ data: { challengerId, opponentId } });
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
