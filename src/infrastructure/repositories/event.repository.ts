import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";

/** Master data (events rarely change post-seed — only their active window matters, and that's
 * checked in-memory against `now`) — memoized to cut DB round-trips. See
 * infrastructure/database/ttl-cache.ts. */
const findAllActiveCached = memoizeWithTtl(
  () =>
    prisma.event.findMany({
      where: { isActive: true },
      include: { milestones: { orderBy: { sortOrder: "asc" } } },
      orderBy: { startAt: "desc" },
    }),
  60_000,
);

export const eventRepository = {
  findAllActive: findAllActiveCached,

  async findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: { milestones: { orderBy: { sortOrder: "asc" } } },
    });
  },
};
