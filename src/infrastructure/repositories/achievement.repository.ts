import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const achievementRepository = {
  async findAllActive() {
    return prisma.achievement.findMany({ where: { isActive: true } });
  },

  async unlockedCodes(playerProfileId: string) {
    const rows = await prisma.playerAchievement.findMany({
      where: { playerProfileId },
      include: { achievement: true },
    });
    return new Set(rows.map((r) => r.achievement.code));
  },

  async unlock(tx: Tx, playerProfileId: string, achievementId: string) {
    return tx.playerAchievement.upsert({
      where: { playerProfileId_achievementId: { playerProfileId, achievementId } },
      create: { playerProfileId, achievementId },
      update: {},
    });
  },
};
