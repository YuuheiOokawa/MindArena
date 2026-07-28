import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const dailyMissionClaimRepository = {
  async listClaimedCodesForDate(playerProfileId: string, dateKey: string) {
    const rows = await prisma.dailyMissionClaim.findMany({
      where: { playerProfileId, claimedForDate: dateKey },
      select: { missionCode: true },
    });
    return new Set(rows.map((r) => r.missionCode));
  },

  /** Race-safe via ON CONFLICT DO NOTHING (the [playerProfileId, missionCode, claimedForDate]
   * unique constraint) — count === 1 means this call was the one that actually claimed it. */
  async tryClaim(tx: Tx, playerProfileId: string, missionCode: string, claimedForDate: string): Promise<boolean> {
    const result = await tx.dailyMissionClaim.createMany({
      data: [{ playerProfileId, missionCode, claimedForDate }],
      skipDuplicates: true,
    });
    return result.count === 1;
  },
};
