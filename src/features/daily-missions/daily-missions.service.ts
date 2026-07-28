import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { dailyMissionClaimRepository } from "@/infrastructure/repositories/daily-mission-claim.repository";
import { awardPoints } from "@/features/points/award-points.service";
import { toJstDateKey } from "@/domain/services/daily-bonus.service";
import { getMissionProgress, isMissionComplete, type DailyMissionCounters } from "@/domain/services/daily-mission.service";
import { DAILY_MISSIONS } from "@/config/daily-missions";
import { PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import type { PlayerProfile } from "@/generated/prisma/client";

function todaysCounters(profile: PlayerProfile, todayKey: string): DailyMissionCounters {
  const countersValidToday = profile.dailyMissionDate === todayKey;
  return {
    loginBonusClaimedToday: profile.lastLoginBonusClaimedAt ? toJstDateKey(profile.lastLoginBonusClaimedAt) === todayKey : false,
    matchesPlayedToday: countersValidToday ? profile.dailyMatchesPlayed : 0,
    matchesWonToday: countersValidToday ? profile.dailyWins : 0,
  };
}

export async function getDailyMissionsStatus(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const todayKey = toJstDateKey(new Date());
  const counters = todaysCounters(profile, todayKey);
  const claimedCodes = await dailyMissionClaimRepository.listClaimedCodesForDate(profile.id, todayKey);

  return DAILY_MISSIONS.map((mission) => ({
    code: mission.code,
    name: mission.name,
    description: mission.description,
    target: mission.target,
    progress: Math.min(getMissionProgress(mission, counters), mission.target),
    rewardPoints: mission.rewardPoints,
    rewardPrizeCurrency: mission.rewardPrizeCurrency,
    completed: isMissionComplete(mission, counters),
    claimed: claimedCodes.has(mission.code),
  }));
}

export async function claimDailyMission(userId: string, missionCode: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const mission = DAILY_MISSIONS.find((m) => m.code === missionCode);
  if (!mission) throw new AppError("NOT_FOUND", "ミッションが見つかりませんでした。");

  const todayKey = toJstDateKey(new Date());
  const counters = todaysCounters(profile, todayKey);
  if (!isMissionComplete(mission, counters)) {
    throw new AppError("CONFLICT", "ミッションの達成条件を満たしていません。");
  }

  await prisma.$transaction(async (tx) => {
    const isNewClaim = await dailyMissionClaimRepository.tryClaim(tx, profile.id, mission.code, todayKey);
    if (!isNewClaim) throw new AppError("CONFLICT", "このミッションはすでに受け取り済みです。");

    if (mission.rewardPoints > 0) {
      await awardPoints(tx, {
        playerProfileId: profile.id,
        currentPoints: profile.totalPoints,
        reason: PointReason.DAILY_BONUS,
        league: profile.currentLeague,
        overrideAmount: mission.rewardPoints,
      });
    }
    if (mission.rewardPrizeCurrency > 0) {
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: { prizeCurrency: { increment: mission.rewardPrizeCurrency }, lifetimePrizeCurrency: { increment: mission.rewardPrizeCurrency } },
      });
    }
  });

  return { claimed: true };
}
