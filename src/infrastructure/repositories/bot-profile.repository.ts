import { prisma } from "@/infrastructure/database/prisma";
import type { BotDifficulty } from "@/domain/enums";

export const botProfileRepository = {
  async sampleForDifficulty(difficulty: BotDifficulty, count: number) {
    const pool = await prisma.botProfile.findMany({ where: { difficulty, isActive: true } });
    if (pool.length === 0) {
      throw new Error(`No active BOT profiles seeded for difficulty ${difficulty}.`);
    }
    const picks = [];
    for (let i = 0; i < count; i++) {
      picks.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return picks;
  },

  async findById(id: string) {
    return prisma.botProfile.findUniqueOrThrow({ where: { id } });
  },
};
