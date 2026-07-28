import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const ownedFurnitureRepository = {
  async listForPlayer(playerProfileId: string) {
    return prisma.userOwnedFurniture.findMany({ where: { playerProfileId }, include: { shopItem: true } });
  },

  async findOne(playerProfileId: string, shopItemId: string) {
    return prisma.userOwnedFurniture.findUnique({ where: { playerProfileId_shopItemId: { playerProfileId, shopItemId } } });
  },

  async create(tx: Tx, playerProfileId: string, shopItemId: string) {
    return tx.userOwnedFurniture.create({ data: { playerProfileId, shopItemId } });
  },

  async incrementQuantity(tx: Tx, id: string) {
    return tx.userOwnedFurniture.update({ where: { id }, data: { quantity: { increment: 1 } } });
  },
};
