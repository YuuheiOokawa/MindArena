import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const eventMilestoneClaimRepository = {
  async listClaimedMilestoneIds(playerProfileId: string, milestoneIds: string[]) {
    const rows = await prisma.eventMilestoneClaim.findMany({
      where: { playerProfileId, eventMilestoneId: { in: milestoneIds } },
      select: { eventMilestoneId: true },
    });
    return new Set(rows.map((r) => r.eventMilestoneId));
  },

  /** Race-safe via ON CONFLICT DO NOTHING (the [eventMilestoneId, playerProfileId] unique
   * constraint) — count === 1 means this call was the one that actually claimed it. Mirrors
   * daily-mission-claim.repository.ts's tryClaim exactly. */
  async tryClaim(tx: Tx, eventMilestoneId: string, playerProfileId: string): Promise<boolean> {
    const result = await tx.eventMilestoneClaim.createMany({
      data: [{ eventMilestoneId, playerProfileId }],
      skipDuplicates: true,
    });
    return result.count === 1;
  },
};
