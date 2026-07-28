import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const furniturePlacementRepository = {
  async listForRoom(userRoomId: string) {
    return prisma.roomFurniturePlacement.findMany({ where: { userRoomId }, include: { ownedFurniture: { include: { shopItem: true } } } });
  },

  async replaceAllForRoom(tx: Tx, userRoomId: string, placements: Array<{ ownedFurnitureId: string; positionX: number; positionY: number; rotation: number }>) {
    await tx.roomFurniturePlacement.deleteMany({ where: { userRoomId } });
    if (placements.length === 0) return;
    await tx.roomFurniturePlacement.createMany({
      data: placements.map((p) => ({ userRoomId, ...p })),
    });
  },

  async deleteOne(userRoomId: string, placementId: string) {
    return prisma.roomFurniturePlacement.deleteMany({ where: { id: placementId, userRoomId } });
  },
};
