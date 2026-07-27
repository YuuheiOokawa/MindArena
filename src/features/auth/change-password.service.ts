import { prisma } from "@/infrastructure/database/prisma";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";
import { AppError } from "@/lib/errors/app-error";

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await userRepository.findByIdWithPasswordHash(userId);
  if (!user) throw new AppError("NOT_FOUND", "アカウントが見つかりません。");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("VALIDATION_ERROR", "現在のパスワードが正しくありません。");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { changed: true };
}
