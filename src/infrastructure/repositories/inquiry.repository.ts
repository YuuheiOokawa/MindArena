import { prisma } from "@/infrastructure/database/prisma";

export const inquiryRepository = {
  async create(data: { userId: string | null; category: string; email: string; message: string }) {
    return prisma.inquiry.create({ data });
  },
};
