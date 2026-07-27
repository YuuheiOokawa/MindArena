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

  /** Race-safe against two concurrent match-finalizes for the same player both deciding this
   * achievement isn't unlocked yet: `skipDuplicates` resolves via ON CONFLICT DO NOTHING (never
   * throws, doesn't poison the surrounding transaction like a caught unique-violation would), and
   * `count` tells the caller whether this call was the one that actually created it — the signal
   * for whether to award the achievement's bonus points exactly once. */
  async unlock(tx: Tx, playerProfileId: string, achievementId: string): Promise<boolean> {
    const result = await tx.playerAchievement.createMany({
      data: [{ playerProfileId, achievementId }],
      skipDuplicates: true,
    });
    return result.count === 1;
  },
};
