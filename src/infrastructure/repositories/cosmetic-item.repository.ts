import { prisma } from "@/infrastructure/database/prisma";

export const cosmeticItemRepository = {
  async findAllActive() {
    return prisma.cosmeticItem.findMany({ where: { isActive: true } });
  },
};
