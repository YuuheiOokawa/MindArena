import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import {
  listIncomingFriendRequests,
  listMyFriends,
  listOutgoingFriendRequests,
  searchPlayerByUsername,
} from "@/features/friends/friend.service";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/features/friends/friend-request.service";
import { sendChallenge } from "@/features/friends/challenge.service";
import { friendChallengeRepository } from "@/infrastructure/repositories/friend-challenge.repository";
import { AppError } from "@/lib/errors/app-error";

/**
 * Integration tests run against a real Postgres database. Exercises the full friend-request
 * lifecycle: search -> send -> duplicate/self guards -> accept -> list -> unfriend.
 */

const RUN_ID = Date.now();
const ALICE_USERNAME = `friend_alice_${RUN_ID}`;
const BOB_USERNAME = `friend_bob_${RUN_ID}`;

let aliceUserId: string;
let bobUserId: string;

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) {
    throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  }

  const alice = await registerUser({
    username: ALICE_USERNAME,
    email: `${ALICE_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  aliceUserId = alice.id;

  const bob = await registerUser({
    username: BOB_USERNAME,
    email: `${BOB_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  bobUserId = bob.id;
});

afterAll(async () => {
  for (const userId of [aliceUserId, bobUserId].filter(Boolean)) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("friend request lifecycle", () => {
  it("finds the other player by username with relation NONE before any request exists", async () => {
    const result = await searchPlayerByUsername(aliceUserId, BOB_USERNAME);
    expect(result.relation).toBe("NONE");
    expect(result.displayName).toBe(BOB_USERNAME);
  });

  it("finds the other player regardless of the casing used to search", async () => {
    const result = await searchPlayerByUsername(aliceUserId, BOB_USERNAME.toUpperCase());
    expect(result.relation).toBe("NONE");
    expect(result.displayName).toBe(BOB_USERNAME);
  });

  it("rejects a self-friend request", async () => {
    await expect(sendFriendRequest(aliceUserId, ALICE_USERNAME)).rejects.toThrow(AppError);
  });

  it("sends a request from alice to bob and lists it on both sides", async () => {
    await sendFriendRequest(aliceUserId, BOB_USERNAME);

    const outgoing = await listOutgoingFriendRequests(aliceUserId);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].to.displayName).toBe(BOB_USERNAME);

    const incoming = await listIncomingFriendRequests(bobUserId);
    expect(incoming).toHaveLength(1);
    expect(incoming[0].from.displayName).toBe(ALICE_USERNAME);
  });

  it("rejects a duplicate request in the same direction while one is pending", async () => {
    await expect(sendFriendRequest(aliceUserId, BOB_USERNAME)).rejects.toThrow(AppError);
  });

  it("reflects REQUEST_SENT / REQUEST_RECEIVED relations while pending", async () => {
    const fromAlice = await searchPlayerByUsername(aliceUserId, BOB_USERNAME);
    expect(fromAlice.relation).toBe("REQUEST_SENT");

    const fromBob = await searchPlayerByUsername(bobUserId, ALICE_USERNAME);
    expect(fromBob.relation).toBe("REQUEST_RECEIVED");
  });

  it("lets bob accept the request, after which both list each other as friends", async () => {
    const incoming = await listIncomingFriendRequests(bobUserId);
    await acceptFriendRequest(bobUserId, incoming[0].friendshipId);

    const aliceFriends = await listMyFriends(aliceUserId);
    expect(aliceFriends.map((f) => f.displayName)).toContain(BOB_USERNAME);

    const bobFriends = await listMyFriends(bobUserId);
    expect(bobFriends.map((f) => f.displayName)).toContain(ALICE_USERNAME);
  });

  it("rejects sending a new request once already friends", async () => {
    await expect(sendFriendRequest(aliceUserId, BOB_USERNAME)).rejects.toThrow(AppError);
  });

  it("lets either side remove the friendship, after which both lists are empty again", async () => {
    const aliceFriends = await listMyFriends(aliceUserId);
    await removeFriendship(aliceUserId, aliceFriends[0].friendshipId);

    expect(await listMyFriends(aliceUserId)).toHaveLength(0);
    expect(await listMyFriends(bobUserId)).toHaveLength(0);
  });
});

describe("mutual friend requests and unfriend cleanup", () => {
  const CAROL_USERNAME = `friend_carol_${RUN_ID}`;
  const DAVE_USERNAME = `friend_dave_${RUN_ID}`;
  const EVE_USERNAME = `friend_eve_${RUN_ID}`;
  const FRANK_USERNAME = `friend_frank_${RUN_ID}`;

  let carolUserId: string;
  let daveUserId: string;
  let eveUserId: string;
  let frankUserId: string;

  beforeAll(async () => {
    async function register(username: string) {
      const user = await registerUser({
        username,
        email: `${username}@example.com`,
        password: "TestPass123",
        confirmPassword: "TestPass123",
        agreedToTerms: true,
      });
      return user.id;
    }

    [carolUserId, daveUserId, eveUserId, frankUserId] = await Promise.all([
      register(CAROL_USERNAME),
      register(DAVE_USERNAME),
      register(EVE_USERNAME),
      register(FRANK_USERNAME),
    ]);
  });

  afterAll(async () => {
    for (const userId of [carolUserId, daveUserId, eveUserId, frankUserId].filter(Boolean)) {
      const profile = await prisma.playerProfile.findUnique({ where: { userId } });
      if (profile) {
        await prisma.friendChallenge.deleteMany({ where: { OR: [{ challengerId: profile.id }, { opponentId: profile.id }] } });
        await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      }
      await prisma.playerProfile.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("auto-accepts instead of erroring when the target already sent a pending request", async () => {
    await sendFriendRequest(carolUserId, DAVE_USERNAME);
    // Dave requesting Carol back, while Carol's request to Dave is still pending, should just
    // become a friendship rather than throwing FRIEND_REQUEST_EXISTS.
    await sendFriendRequest(daveUserId, CAROL_USERNAME);

    const carolFriends = await listMyFriends(carolUserId);
    expect(carolFriends.map((f) => f.displayName)).toContain(DAVE_USERNAME);
    const daveFriends = await listMyFriends(daveUserId);
    expect(daveFriends.map((f) => f.displayName)).toContain(CAROL_USERNAME);

    expect(await listOutgoingFriendRequests(carolUserId)).toHaveLength(0);
    expect(await listIncomingFriendRequests(daveUserId)).toHaveLength(0);
  });

  it("declines a pending friend challenge when the friendship is removed", async () => {
    await sendFriendRequest(eveUserId, FRANK_USERNAME);
    const incoming = await listIncomingFriendRequests(frankUserId);
    await acceptFriendRequest(frankUserId, incoming[0].friendshipId);

    const frankProfile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: frankUserId } });

    const challenge = await sendChallenge(eveUserId, frankProfile.id);
    expect(challenge.status).toBe("PENDING");

    const eveFriends = await listMyFriends(eveUserId);
    await removeFriendship(eveUserId, eveFriends[0].friendshipId);

    const freshChallenge = await friendChallengeRepository.findById(challenge.id);
    expect(freshChallenge?.status).toBe("DECLINED");
  });
});
