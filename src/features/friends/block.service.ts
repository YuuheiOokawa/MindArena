import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { blockRepository } from "@/infrastructure/repositories/block.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { friendChallengeRepository } from "@/infrastructure/repositories/friend-challenge.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { AppError } from "@/lib/errors/app-error";
import { toFriendCard } from "./friend-card.mapper";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

/** Blocking severs any existing friendship (and its pending challenges/invites) the same way
 * removeFriendship does — a blocked pair shouldn't stay able to battle each other just because
 * the friendship row predates the block. */
export async function blockUser(userId: string, targetProfileId: string, reason?: string) {
  const profile = await requireProfile(userId);
  if (targetProfileId === profile.id) throw new AppError("VALIDATION_ERROR", "自分自身をブロックすることはできません。");

  const target = await playerProfileRepository.findById(targetProfileId);
  if (!target) throw new AppError("NOT_FOUND", "対象のプレイヤーが見つかりませんでした。");

  await blockRepository.create(profile.id, targetProfileId, reason?.trim() || null);

  const friendship = await friendshipRepository.findBetween(profile.id, targetProfileId);
  if (friendship) {
    await friendshipRepository.delete(friendship.id);
    await Promise.all([
      friendChallengeRepository.declineAllPendingBetween(profile.id, targetProfileId),
      tournamentInviteRepository.declinePendingBetween(profile.id, targetProfileId),
    ]);
  }

  return { blocked: true };
}

export async function unblockUser(userId: string, targetProfileId: string) {
  const profile = await requireProfile(userId);
  await blockRepository.delete(profile.id, targetProfileId);
  return { blocked: false };
}

export async function listBlockedUsers(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await blockRepository.listBlockedByMe(profile.id);
  return rows.map((row) => ({
    blockId: row.blockId,
    reason: row.reason,
    createdAt: row.createdAt,
    ...toFriendCard(row.blocked, row.blocked.user.username),
  }));
}
