import { prisma } from "@/infrastructure/database/prisma";

export const gameTypeRepository = {
  async findAllActive() {
    return prisma.gameType.findMany({ where: { isActive: true } });
  },

  async findByCode(code: string) {
    return prisma.gameType.findUniqueOrThrow({ where: { code } });
  },

  async findById(id: string) {
    return prisma.gameType.findUniqueOrThrow({ where: { id } });
  },

  /** Picks any active game for a match; MVP has no per-round game rotation rules beyond league.gameIds. */
  async pickRandomActive() {
    const all = await prisma.gameType.findMany({ where: { isActive: true } });
    if (all.length === 0) throw new Error("No active GameType rows seeded.");
    return all[Math.floor(Math.random() * all.length)];
  },
};
