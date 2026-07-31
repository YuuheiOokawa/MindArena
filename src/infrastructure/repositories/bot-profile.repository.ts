import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";
import type { BotDifficulty } from "@/domain/enums";

/** Master data (60 bot profiles, rarely change post-seed) — memoized per difficulty band to cut
 * DB round-trips on this every-bracket-fill read. See infrastructure/database/ttl-cache.ts. */
const poolByDifficulty = new Map<BotDifficulty, () => Promise<Awaited<ReturnType<typeof loadPool>>>>();

function loadPool(difficulty: BotDifficulty) {
  return prisma.botProfile.findMany({ where: { difficulty, isActive: true } });
}

function cachedPoolFor(difficulty: BotDifficulty) {
  let cached = poolByDifficulty.get(difficulty);
  if (!cached) {
    cached = memoizeWithTtl(() => loadPool(difficulty), 60_000);
    poolByDifficulty.set(difficulty, cached);
  }
  return cached;
}

export const botProfileRepository = {
  async sampleForDifficulty(difficulty: BotDifficulty, count: number) {
    const pool = await cachedPoolFor(difficulty)();
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
