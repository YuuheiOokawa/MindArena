import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";

/** Master data (game types rarely change post-seed) — memoized to cut DB round-trips on this
 * near-every-match read. See infrastructure/database/ttl-cache.ts. */
const findAllActiveCached = memoizeWithTtl(() => prisma.gameType.findMany({ where: { isActive: true } }), 60_000);

export const gameTypeRepository = {
  findAllActive: findAllActiveCached,

  async findByCode(code: string) {
    return prisma.gameType.findUniqueOrThrow({ where: { code } });
  },

  async findById(id: string) {
    return prisma.gameType.findUniqueOrThrow({ where: { id } });
  },

  /** Picks any active game for a match; MVP has no per-round game rotation rules beyond league.gameIds. */
  async pickRandomActive() {
    const all = await findAllActiveCached();
    if (all.length === 0) throw new Error("No active GameType rows seeded.");
    return all[Math.floor(Math.random() * all.length)];
  },
};
