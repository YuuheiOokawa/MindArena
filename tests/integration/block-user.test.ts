import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests, listMyFriends, searchPlayerByUsername } from "@/features/friends/friend.service";
import { blockUser, unblockUser, listBlockedUsers } from "@/features/friends/block.service";
import { sendChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `blk_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id, username: uname };
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.block.deleteMany({ where: { OR: [{ blockerId: profile.id }, { blockedId: profile.id }] } });
      await prisma.friendChallenge.deleteMany({ where: { OR: [{ challengerId: profile.id }, { opponentId: profile.id }] } });
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("blocking a user", () => {
  it("rejects blocking yourself", async () => {
    const alice = await makeUser("alice");
    await expect(blockUser(alice.userId, alice.profileId)).rejects.toThrow(AppError);
  });

  it("removes an existing friendship and its pending challenge when one side blocks the other", async () => {
    const bob = await makeUser("bob");
    const carol = await makeUser("carol");

    await sendFriendRequest(bob.userId, carol.username);
    const incoming = await listIncomingFriendRequests(carol.userId);
    await acceptFriendRequest(carol.userId, incoming[0].friendshipId);
    await sendChallenge(bob.userId, carol.profileId);

    expect((await listMyFriends(bob.userId)).some((f) => f.profileId === carol.profileId)).toBe(true);
    expect((await listIncomingChallenges(carol.userId)).length).toBe(1);

    await blockUser(bob.userId, carol.profileId, "スパム行為");

    expect((await listMyFriends(bob.userId)).some((f) => f.profileId === carol.profileId)).toBe(false);
    expect((await listIncomingChallenges(carol.userId)).length).toBe(0);
  });

  it("prevents the blocked user (and the blocker) from finding each other or sending a new request", async () => {
    const dave = await makeUser("dave");
    const erin = await makeUser("erin");
    await blockUser(dave.userId, erin.profileId);

    await expect(searchPlayerByUsername(dave.userId, erin.username)).rejects.toThrow(AppError);
    await expect(searchPlayerByUsername(erin.userId, dave.username)).rejects.toThrow(AppError);
    await expect(sendFriendRequest(erin.userId, dave.username)).rejects.toThrow(AppError);
  });

  it("lists blocked users with their reason, and unblocking allows a fresh friend request", async () => {
    const frank = await makeUser("frank");
    const gina = await makeUser("gina");
    await blockUser(frank.userId, gina.profileId, "テスト理由");

    const blockedList = await listBlockedUsers(frank.userId);
    expect(blockedList).toHaveLength(1);
    expect(blockedList[0].profileId).toBe(gina.profileId);
    expect(blockedList[0].reason).toBe("テスト理由");

    await unblockUser(frank.userId, gina.profileId);
    expect(await listBlockedUsers(frank.userId)).toHaveLength(0);

    // No longer blocked — a friend request between them succeeds again.
    await expect(sendFriendRequest(gina.userId, frank.username)).resolves.toBeDefined();
  });
});
