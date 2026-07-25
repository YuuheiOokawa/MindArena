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

  /** Case-insensitive lookup for user-facing username search (friend search, add-by-username) —
   * usernames are stored with whatever casing the owner registered with, but players shouldn't
   * need to remember it exactly to find each other. */
  async findByUsernameCaseInsensitive(username: string) {
    return prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
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
