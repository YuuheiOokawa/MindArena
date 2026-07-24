import { prisma } from "@/infrastructure/database/prisma";

export const cosmeticPurchaseRepository = {
  async listForPlayer(playerProfileId: string) {
    return prisma.cosmeticPurchase.findMany({ where: { playerProfileId }, include: { cosmeticItem: true } });
  },

  async findOne(playerProfileId: string, cosmeticItemId: string) {
    return prisma.cosmeticPurchase.findUnique({
      where: { playerProfileId_cosmeticItemId: { playerProfileId, cosmeticItemId } },
    });
  },

  async create(playerProfileId: string, cosmeticItemId: string) {
    return prisma.cosmeticPurchase.create({ data: { playerProfileId, cosmeticItemId } });
  },
};
