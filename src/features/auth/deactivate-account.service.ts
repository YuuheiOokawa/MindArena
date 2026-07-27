import { prisma } from "@/infrastructure/database/prisma";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { verifyPassword } from "@/infrastructure/auth/password";
import { AppError } from "@/lib/errors/app-error";

/**
 * 退会 (account deletion). Implemented as anonymize-and-deactivate rather than a hard row
 * delete: this account may be the opponent on record in other players' match/friend history,
 * and TournamentParticipant.playerId isn't cascade-deleted, so a raw `user.delete()` risks
 * either a foreign-key failure mid-tournament or silently corrupting someone else's bracket
 * view. Scrubbing identifying fields and marking `deletedAt` gets the same practical outcome
 * (the account is gone, its credentials no longer work, its original username/email are free
 * to re-register) without touching rows other players depend on.
 */
export async function deactivateAccount(userId: string, password: string) {
  const user = await userRepository.findByIdWithPasswordHash(userId);
  if (!user) throw new AppError("NOT_FOUND", "アカウントが見つかりません。");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError("VALIDATION_ERROR", "パスワードが正しくありません。");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        username: `deleted_${userId}`,
        email: `deleted-${userId}@deleted.mindarena.local`,
        passwordHash: "",
      },
    });
    await tx.playerProfile.updateMany({
      where: { userId },
      data: {
        displayName: "退会したユーザー",
        customAvatarUrl: null,
        selectedAvatarIconId: null,
      },
    });
  });
}
