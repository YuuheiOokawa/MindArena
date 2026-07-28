import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const userRoomRepository = {
  async findForPlayer(playerProfileId: string) {
    return prisma.userRoom.findUnique({
      where: { playerProfileId },
      include: { roomType: true, placements: { include: { ownedFurniture: { include: { shopItem: true } } } } },
    });
  },

  async create(tx: Tx, playerProfileId: string, roomTypeId: string) {
    return tx.userRoom.create({ data: { playerProfileId, roomTypeId } });
  },

  async upgrade(tx: Tx, id: string, roomTypeId: string) {
    return tx.userRoom.update({ where: { id }, data: { roomTypeId, upgradedAt: new Date() } });
  },
};
