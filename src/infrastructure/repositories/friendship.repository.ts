import { prisma } from "@/infrastructure/database/prisma";
import { FriendshipStatus } from "@/domain/enums";

const PROFILE_CARD_SELECT = {
  id: true,
  displayName: true,
  totalPoints: true,
  selectedTitleId: true,
  selectedFrameId: true,
  currentLeague: { select: { code: true, displayName: true } },
  user: { select: { username: true } },
} as const;

export const friendshipRepository = {
  async findBetween(profileIdA: string, profileIdB: string) {
    return prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: profileIdA, addresseeId: profileIdB },
          { requesterId: profileIdB, addresseeId: profileIdA },
        ],
      },
    });
  },

  async create(requesterId: string, addresseeId: string) {
    return prisma.friendship.create({ data: { requesterId, addresseeId } });
  },

  async findById(id: string) {
    return prisma.friendship.findUnique({ where: { id } });
  },

  async accept(id: string) {
    return prisma.friendship.update({ where: { id }, data: { status: FriendshipStatus.ACCEPTED } });
  },

  async delete(id: string) {
    await prisma.friendship.delete({ where: { id } });
  },

  async listFriends(profileId: string) {
    const rows = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: profileId }, { addresseeId: profileId }],
      },
      include: {
        requester: { select: PROFILE_CARD_SELECT },
        addressee: { select: PROFILE_CARD_SELECT },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => ({
      friendshipId: row.id,
      friend: row.requesterId === profileId ? row.addressee : row.requester,
      since: row.updatedAt,
    }));
  },

  async listIncomingRequests(profileId: string) {
    return prisma.friendship.findMany({
      where: { addresseeId: profileId, status: FriendshipStatus.PENDING },
      include: { requester: { select: PROFILE_CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });
  },

  async listOutgoingRequests(profileId: string) {
    return prisma.friendship.findMany({
      where: { requesterId: profileId, status: FriendshipStatus.PENDING },
      include: { addressee: { select: PROFILE_CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });
  },

  async countFriends(profileId: string) {
    return prisma.friendship.count({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: profileId }, { addresseeId: profileId }],
      },
    });
  },
};
