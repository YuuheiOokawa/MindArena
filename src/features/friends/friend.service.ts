import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { friendshipRepository } from "@/infrastructure/repositories/friendship.repository";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { blockRepository } from "@/infrastructure/repositories/block.repository";
import { FriendshipStatus } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import { toFriendCard } from "./friend-card.mapper";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

export async function listMyFriends(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await friendshipRepository.listFriends(profile.id);
  return rows.map((row) => ({
    ...toFriendCard(row.friend, row.friend.user.username),
    friendshipId: row.friendshipId,
    since: row.since,
  }));
}

export async function listIncomingFriendRequests(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await friendshipRepository.listIncomingRequests(profile.id);
  return rows.map((row) => ({
    friendshipId: row.id,
    createdAt: row.createdAt,
    from: toFriendCard(row.requester, row.requester.user.username),
  }));
}

export async function listOutgoingFriendRequests(userId: string) {
  const profile = await requireProfile(userId);
  const rows = await friendshipRepository.listOutgoingRequests(profile.id);
  return rows.map((row) => ({
    friendshipId: row.id,
    createdAt: row.createdAt,
    to: toFriendCard(row.addressee, row.addressee.user.username),
  }));
}

/** Looks up a player by exact username so a request can be sent; excludes the caller and reveals no unrelated accounts. */
export async function searchPlayerByUsername(userId: string, username: string) {
  const profile = await requireProfile(userId);
  const targetUser = await userRepository.findByUsernameCaseInsensitive(username);
  if (!targetUser) throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");

  const targetProfile = await playerProfileRepository.findByUserId(targetUser.id);
  if (!targetProfile) throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");

  if (targetProfile.id === profile.id) {
    throw new AppError("CANNOT_FRIEND_SELF");
  }

  if (await blockRepository.existsEitherWay(profile.id, targetProfile.id)) {
    throw new AppError("NOT_FOUND", "そのユーザー名のプレイヤーは見つかりませんでした。");
  }

  const existing = await friendshipRepository.findBetween(profile.id, targetProfile.id);
  const relation: "NONE" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" = !existing
    ? "NONE"
    : existing.status === FriendshipStatus.ACCEPTED
      ? "FRIENDS"
      : existing.requesterId === profile.id
        ? "REQUEST_SENT"
        : "REQUEST_RECEIVED";

  return { ...toFriendCard(targetProfile, targetUser.username), relation, friendshipId: existing?.id ?? null };
}
