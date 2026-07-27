import { prisma } from "@/infrastructure/database/prisma";

const PROFILE_CARD_SELECT = {
  id: true,
  displayName: true,
  totalPoints: true,
  selectedTitleId: true,
  selectedFrameId: true,
  currentLeague: { select: { code: true, displayName: true } },
  user: { select: { username: true } },
} as const;

export const blockRepository = {
  async create(blockerId: string, blockedId: string, reason: string | null) {
    return prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: { reason },
      create: { blockerId, blockedId, reason },
    });
  },

  async delete(blockerId: string, blockedId: string) {
    await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  },

  /** True if either side has blocked the other — used to gate new interactions symmetrically. */
  async existsEitherWay(profileIdA: string, profileIdB: string) {
    const count = await prisma.block.count({
      where: {
        OR: [
          { blockerId: profileIdA, blockedId: profileIdB },
          { blockerId: profileIdB, blockedId: profileIdA },
        ],
      },
    });
    return count > 0;
  },

  async listBlockedByMe(blockerId: string) {
    const rows = await prisma.block.findMany({
      where: { blockerId },
      include: { blocked: { select: PROFILE_CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ blockId: row.id, reason: row.reason, createdAt: row.createdAt, blocked: row.blocked }));
  },
};
