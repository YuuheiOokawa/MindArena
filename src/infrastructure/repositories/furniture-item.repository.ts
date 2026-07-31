import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";

/** Master data (furniture items rarely change post-seed) — memoized to cut DB round-trips on
 * this every-shop-page read. See infrastructure/database/ttl-cache.ts. */
const findAllActiveCached = memoizeWithTtl(
  () => prisma.shopFurnitureItem.findMany({ where: { isActive: true }, include: { requiredLeague: true } }),
  60_000,
);

export const furnitureItemRepository = {
  findAllActive: findAllActiveCached,

  async findById(id: string) {
    return prisma.shopFurnitureItem.findUnique({ where: { id }, include: { requiredLeague: true } });
  },
};
