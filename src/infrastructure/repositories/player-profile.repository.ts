import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const playerProfileRepository = {
  async findByUserId(userId: string) {
    return prisma.playerProfile.findUnique({ where: { userId }, include: { currentLeague: true } });
  },

  async findById(id: string) {
    return prisma.playerProfile.findUnique({ where: { id }, include: { currentLeague: true } });
  },

  async create(data: { userId: string; displayName: string; currentLeagueId: string }) {
    return prisma.playerProfile.create({ data });
  },

  async update(id: string, data: Prisma.PlayerProfileUpdateInput) {
    return prisma.playerProfile.update({ where: { id }, data });
  },

  async listGameStats(playerProfileId: string) {
    return prisma.playerGameStats.findMany({ where: { playerProfileId }, include: { gameType: true } });
  },

  async listAchievements(playerProfileId: string) {
    return prisma.playerAchievement.findMany({ where: { playerProfileId }, include: { achievement: true } });
  },

  async listPointHistory(playerProfileId: string, cursor?: string, limit = 20) {
    return prisma.pointTransaction.findMany({
      where: { playerProfileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  },
};
