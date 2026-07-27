import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { awardPoints } from "@/features/points/award-points.service";
import { canClaimDailyBonus, computeNextStreakDay, startOfJstDay } from "@/domain/services/daily-bonus.service";
import { DAILY_BONUS_TIERS, getDailyBonusTier } from "@/config/daily-bonus";
import { PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

export async function getDailyBonusStatus(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const now = new Date();
  const claimable = canClaimDailyBonus(profile.lastLoginBonusClaimedAt, now);
  // computeNextStreakDay projects what a NEW claim would pay out — meaningless while `claimable`
  // is false (already claimed today), since asking "what would today's claim be" after it already
  // happened would wrongly look like a missed day. Show the streak day that WAS just claimed instead.
  const nextStreakDay = claimable
    ? computeNextStreakDay(profile.lastLoginBonusClaimedAt, profile.loginBonusStreak, now)
    : profile.loginBonusStreak;

  return {
    claimable,
    currentStreak: profile.loginBonusStreak,
    nextStreakDay,
    nextTier: getDailyBonusTier(nextStreakDay),
    tiers: DAILY_BONUS_TIERS,
  };
}

export async function claimDailyBonus(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const now = new Date();
  if (!canClaimDailyBonus(profile.lastLoginBonusClaimedAt, now)) {
    throw new AppError("CONFLICT", "本日のログインボーナスはすでに受け取っています。");
  }

  const nextStreakDay = computeNextStreakDay(profile.lastLoginBonusClaimedAt, profile.loginBonusStreak, now);
  const tier = getDailyBonusTier(nextStreakDay);

  const result = await prisma.$transaction(async (tx) => {
    // Race-safe against a duplicate claim within the same instant: only succeeds if no claim has
    // landed since today's JST midnight, mirroring the read-check above but re-evaluated against
    // the committed row at write time (see shop.service.ts's purchase guard for the same pattern).
    const updated = await tx.playerProfile.updateMany({
      where: {
        id: profile.id,
        OR: [{ lastLoginBonusClaimedAt: null }, { lastLoginBonusClaimedAt: { lt: startOfJstDay(now) } }],
      },
      data: { lastLoginBonusClaimedAt: now, loginBonusStreak: nextStreakDay },
    });
    if (updated.count === 0) throw new AppError("CONFLICT", "本日のログインボーナスはすでに受け取っています。");

    if (tier.points > 0) {
      await awardPoints(tx, {
        playerProfileId: profile.id,
        currentPoints: profile.totalPoints,
        reason: PointReason.DAILY_BONUS,
        league: profile.currentLeague,
        overrideAmount: tier.points,
      });
    }
    if (tier.prizeCurrency > 0) {
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: { prizeCurrency: { increment: tier.prizeCurrency }, lifetimePrizeCurrency: { increment: tier.prizeCurrency } },
      });
    }

    return tier;
  });

  return { streakDay: nextStreakDay, tier: result };
}
