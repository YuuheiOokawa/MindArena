import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { userRepository } from "@/infrastructure/repositories/user.repository";
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

  const existing = await friendshipRepository.findBetween(profile.id, targetProfile.id);
  if (existing) {
    throw new AppError(existing.status === FriendshipStatus.ACCEPTED ? "ALREADY_FRIENDS" : "FRIEND_REQUEST_EXISTS");
  }

  return friendshipRepository.create(profile.id, targetProfile.id);
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

/** Declines an incoming request (addressee) or cancels one the caller sent (requester). Either party may also call this to unfriend an accepted pair. */
export async function removeFriendship(userId: string, friendshipId: string) {
  const profile = await requireProfile(userId);
  const friendship = await friendshipRepository.findById(friendshipId);
  if (!friendship || (friendship.requesterId !== profile.id && friendship.addresseeId !== profile.id)) {
    throw new AppError("FRIEND_REQUEST_NOT_FOUND");
  }
  await friendshipRepository.delete(friendshipId);
}
