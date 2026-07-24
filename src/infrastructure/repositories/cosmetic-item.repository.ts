import { prisma } from "@/infrastructure/database/prisma";

export const cosmeticItemRepository = {
  async findAllActive() {
    return prisma.cosmeticItem.findMany({ where: { isActive: true } });
  },

  async findManyByIds(ids: string[]) {
    return prisma.cosmeticItem.findMany({ where: { id: { in: ids } } });
  },
};
