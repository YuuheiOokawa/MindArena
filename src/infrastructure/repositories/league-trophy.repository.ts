import { prisma } from "@/infrastructure/database/prisma";

export const leagueTrophyRepository = {
  async listForPlayer(playerProfileId: string) {
    return prisma.leagueTrophy.findMany({
      where: { playerProfileId },
      include: { league: true },
      orderBy: { league: { displayOrder: "asc" } },
    });
  },
};
