import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { eventRepository } from "@/infrastructure/repositories/event.repository";
import { eventScoreRepository } from "@/infrastructure/repositories/event-score.repository";
import { eventMilestoneClaimRepository } from "@/infrastructure/repositories/event-milestone-claim.repository";
import { awardPoints } from "@/features/points/award-points.service";
import { isEventActive, isEventUpcoming, isMilestoneClaimable } from "@/domain/services/event.service";
import { PointReason } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

const LEADERBOARD_TOP_N = 20;

type EventStatus = "ACTIVE" | "UPCOMING" | "ENDED";

function statusOf(event: { startAt: Date; endAt: Date }, now: Date): EventStatus {
  if (isEventActive(event, now)) return "ACTIVE";
  if (isEventUpcoming(event, now)) return "UPCOMING";
  return "ENDED";
}

/** List every event (excluding events with `isActive: false`, i.e. administratively disabled),
 * newest first, with the viewer's own score and how many milestones they can still claim. */
export async function listEvents(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const events = await eventRepository.findAllActive();
  const scoreByEventId = await eventScoreRepository.findForPlayerAcrossEvents(events.map((e) => e.id), profile.id);
  const allMilestoneIds = events.flatMap((e) => e.milestones.map((m) => m.id));
  const claimedIds = await eventMilestoneClaimRepository.listClaimedMilestoneIds(profile.id, allMilestoneIds);

  const now = new Date();
  return events.map((event) => {
    const myScore = scoreByEventId.get(event.id) ?? 0;
    const claimableCount = event.milestones.filter((m) => isMilestoneClaimable(m, myScore, claimedIds.has(m.id))).length;

    return {
      id: event.id,
      code: event.code,
      name: event.name,
      description: event.description,
      themeKey: event.themeKey,
      startAt: event.startAt,
      endAt: event.endAt,
      status: statusOf(event, now),
      myScore,
      milestoneCount: event.milestones.length,
      claimableCount,
    };
  });
}

export async function getEventDetail(userId: string, eventId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const event = await eventRepository.findById(eventId);
  if (!event || !event.isActive) throw new AppError("NOT_FOUND", "イベントが見つかりませんでした。");

  const [scoreRow, claimedIds, topScores] = await Promise.all([
    eventScoreRepository.findForPlayer(event.id, profile.id),
    eventMilestoneClaimRepository.listClaimedMilestoneIds(profile.id, event.milestones.map((m) => m.id)),
    eventScoreRepository.listTop(event.id, LEADERBOARD_TOP_N),
  ]);
  const myScore = scoreRow?.score ?? 0;

  const milestones = event.milestones.map((milestone) => ({
    code: milestone.code,
    name: milestone.name,
    requiredScore: milestone.requiredScore,
    rewardPoints: milestone.rewardPoints,
    rewardPrizeCurrency: milestone.rewardPrizeCurrency,
    progress: Math.min(myScore, milestone.requiredScore),
    completed: myScore >= milestone.requiredScore,
    claimed: claimedIds.has(milestone.id),
  }));

  // Competition ranking (1, 2, 2, 4, ...) over the fetched top-N page — same convention as
  // leaderboard.service.ts's getLeaderboard.
  let rank = 0;
  const entries = topScores.map((row, i) => {
    if (i === 0 || row.score !== topScores[i - 1].score) rank = i + 1;
    return {
      rank,
      playerProfileId: row.playerProfile.id,
      displayName: row.playerProfile.displayName,
      avatarIconId: row.playerProfile.selectedAvatarIconId,
      customAvatarUrl: row.playerProfile.customAvatarUrl,
      score: row.score,
      isMe: row.playerProfile.id === profile.id,
    };
  });
  const myRank = scoreRow ? (await eventScoreRepository.countAboveScore(event.id, scoreRow.score)) + 1 : null;

  const now = new Date();
  return {
    id: event.id,
    code: event.code,
    name: event.name,
    description: event.description,
    themeKey: event.themeKey,
    startAt: event.startAt,
    endAt: event.endAt,
    status: statusOf(event, now),
    myScore,
    milestones,
    leaderboard: { entries, myRank },
  };
}

export async function claimEventMilestone(userId: string, eventId: string, milestoneCode: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const event = await eventRepository.findById(eventId);
  if (!event || !event.isActive) throw new AppError("NOT_FOUND", "イベントが見つかりませんでした。");

  const milestone = event.milestones.find((m) => m.code === milestoneCode);
  if (!milestone) throw new AppError("NOT_FOUND", "マイルストーンが見つかりませんでした。");

  const scoreRow = await eventScoreRepository.findForPlayer(event.id, profile.id);
  const myScore = scoreRow?.score ?? 0;
  if (myScore < milestone.requiredScore) {
    throw new AppError("CONFLICT", "マイルストーンの達成条件を満たしていません。");
  }

  await prisma.$transaction(async (tx) => {
    const isNewClaim = await eventMilestoneClaimRepository.tryClaim(tx, milestone.id, profile.id);
    if (!isNewClaim) throw new AppError("CONFLICT", "この報酬はすでに受け取り済みです。");

    if (milestone.rewardPoints > 0) {
      await awardPoints(tx, {
        playerProfileId: profile.id,
        currentPoints: profile.totalPoints,
        reason: PointReason.EVENT_MILESTONE,
        league: profile.currentLeague,
        overrideAmount: milestone.rewardPoints,
      });
    }
    if (milestone.rewardPrizeCurrency > 0) {
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          prizeCurrency: { increment: milestone.rewardPrizeCurrency },
          lifetimePrizeCurrency: { increment: milestone.rewardPrizeCurrency },
        },
      });
    }
  });

  return { claimed: true };
}
