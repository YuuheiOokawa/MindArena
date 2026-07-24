import { prisma } from "@/infrastructure/database/prisma";
import type { UserEntity } from "@/domain/entities";

function toEntity(row: { id: string; username: string; email: string; createdAt: Date; lastLoginAt: Date | null }): UserEntity {
  return { id: row.id, username: row.username, email: row.email, createdAt: row.createdAt, lastLoginAt: row.lastLoginAt };
}

export const userRepository = {
  async findByUsernameOrEmail(identifier: string) {
    return prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
  },

  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<UserEntity | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  },

  async touchLastLogin(id: string) {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  },
};
