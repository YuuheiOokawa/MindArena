import { prisma } from "@/infrastructure/database/prisma";

export const furnitureItemRepository = {
  async findAllActive() {
    return prisma.shopFurnitureItem.findMany({ where: { isActive: true }, include: { requiredLeague: true } });
  },

  async findById(id: string) {
    return prisma.shopFurnitureItem.findUnique({ where: { id }, include: { requiredLeague: true } });
  },
};
