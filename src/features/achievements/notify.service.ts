import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { ACHIEVEMENTS } from "@/config/achievements";
import { AppError } from "@/lib/errors/app-error";

/**
 * Consumes (returns + marks `notifiedAt`) any achievement unlocks the player hasn't seen a
 * celebration for yet. Deliberately decoupled from which match/action actually crossed the
 * threshold (see progress.service.ts's checkAndUnlockAchievements) — the unlock is announced
 * the next time the player looks at a screen that calls this, even if they closed the app
 * right after the match that earned it.
 */
export async function consumeUnseenAchievements(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const unseen = await prisma.playerAchievement.findMany({
    where: { playerProfileId: profile.id, notifiedAt: null },
    include: { achievement: true },
    orderBy: { unlockedAt: "asc" },
  });
  if (unseen.length === 0) return [];

  await prisma.playerAchievement.updateMany({
    where: { id: { in: unseen.map((u) => u.id) } },
    data: { notifiedAt: new Date() },
  });

  return unseen.map((u) => ({
    code: u.achievement.code,
    name: u.achievement.name,
    description: u.achievement.description,
    rewardPoints: ACHIEVEMENTS.find((a) => a.code === u.achievement.code)?.rewardPoints ?? 0,
  }));
}
