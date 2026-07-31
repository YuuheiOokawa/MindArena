import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";

/** Master data (room types rarely change post-seed) — memoized to cut DB round-trips on this
 * every-shop/every-room-page read. See infrastructure/database/ttl-cache.ts. */
const findAllActiveCached = memoizeWithTtl(
  () => prisma.roomType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { requiredLeague: true } }),
  60_000,
);

export const roomTypeRepository = {
  findAllActive: findAllActiveCached,

  async findByCode(code: string) {
    return prisma.roomType.findUnique({ where: { code }, include: { requiredLeague: true } });
  },

  async findById(id: string) {
    return prisma.roomType.findUnique({ where: { id }, include: { requiredLeague: true } });
  },
};
