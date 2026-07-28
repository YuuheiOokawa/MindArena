import { prisma } from "@/infrastructure/database/prisma";

export const roomTypeRepository = {
  async findAllActive() {
    return prisma.roomType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { requiredLeague: true } });
  },

  async findByCode(code: string) {
    return prisma.roomType.findUnique({ where: { code }, include: { requiredLeague: true } });
  },

  async findById(id: string) {
    return prisma.roomType.findUnique({ where: { id }, include: { requiredLeague: true } });
  },
};
