import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { friendChallengeRepository } from "@/infrastructure/repositories/friend-challenge.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { blockRepository } from "@/infrastructure/repositories/block.repository";
import { withKeysLock } from "@/infrastructure/repositories/advisory-lock.repository";
import { FriendshipStatus } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

export async function sendFriendRequest(userId: string, targetUsername: string) {
  const profile = await requireProfile(userId);

  const targetUser = await userRepository.findByUsernameCaseInsensitive(targetUsername);
  if (!targetUser) throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");

  const targetProfile = await playerProfileRepository.findByUserId(targetUser.id);
  if (!targetProfile) throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");

  if (targetProfile.id === profile.id) {
    throw new AppError("CANNOT_FRIEND_SELF");
  }

  if (await blockRepository.existsEitherWay(profile.id, targetProfile.id)) {
    throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");
  }

  // Locked on both ids so two requests fired within the same instant (either side double-
  // clicking "申請", or both players requesting each other at once) can't both read "no existing
  // friendship" and both insert a row.
  return withKeysLock([profile.id, targetProfile.id], async () => {
    const existing = await friendshipRepository.findBetween(profile.id, targetProfile.id);
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) throw new AppError("ALREADY_FRIENDS");
      // They already sent US a pending request — treat this as accepting theirs instead of
      // erroring, so two people who tap "申請" on each other just become friends.
      if (existing.requesterId === targetProfile.id) {
        return friendshipRepository.accept(existing.id);
      }
      throw new AppError("FRIEND_REQUEST_EXISTS");
    }

    return friendshipRepository.create(profile.id, targetProfile.id);
  });
}

export async function acceptFriendRequest(userId: string, friendshipId: string) {
  const profile = await requireProfile(userId);
  const friendship = await friendshipRepository.findById(friendshipId);
  if (!friendship || friendship.addresseeId !== profile.id) {
    throw new AppError("FRIEND_REQUEST_NOT_FOUND");
  }
  if (friendship.status !== FriendshipStatus.PENDING) {
    throw new AppError("ALREADY_FRIENDS");
  }
  return friendshipRepository.accept(friendshipId);
}

/** Declines an incoming request (addressee) or cancels one the caller sent (requester). Either
 * party may also call this to unfriend an accepted pair — which also cancels any still-PENDING
 * friend challenge or tournament invite between them, so accepting one afterward can't create a
 * real tournament (with real point payouts) between two accounts that are no longer friends. */
export async function removeFriendship(userId: string, friendshipId: string) {
  const profile = await requireProfile(userId);
  const friendship = await friendshipRepository.findById(friendshipId);
  if (!friendship || (friendship.requesterId !== profile.id && friendship.addresseeId !== profile.id)) {
    throw new AppError("FRIEND_REQUEST_NOT_FOUND");
  }
  await friendshipRepository.delete(friendshipId);
  await Promise.all([
    friendChallengeRepository.declineAllPendingBetween(friendship.requesterId, friendship.addresseeId),
    tournamentInviteRepository.declinePendingBetween(friendship.requesterId, friendship.addresseeId),
  ]);
}
