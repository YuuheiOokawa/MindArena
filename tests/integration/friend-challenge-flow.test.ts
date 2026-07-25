import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import {
  sendChallenge,
  listIncomingChallenges,
  listOutgoingChallenges,
  acceptChallenge,
  declineChallenge,
} from "@/features/friends/challenge.service";
import { AppError } from "@/lib/errors/app-error";

/**
 * Integration tests for the friend-challenge lifecycle against a real Postgres database.
 * Accepting a challenge creates a 2-player Tournament (maxPlayers=2) that reuses the normal
 * bracket/match/session machinery — this exercises that generalization (previously hardcoded
 * to exactly 32 participants) end to end at the data layer.
 */

const RUN_ID = Date.now();
const ALICE_USERNAME = `chal_alice_${RUN_ID}`;
const BOB_USERNAME = `chal_bob_${RUN_ID}`;
const CAROL_USERNAME = `chal_carol_${RUN_ID}`;

let aliceUserId: string;
let aliceProfileId: string;
let bobUserId: string;
let bobProfileId: string;
let carolUserId: string;
let carolProfileId: string;

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
  aliceProfileId = (await prisma.playerProfile.findUniqueOrThrow({ where: { userId: aliceUserId } })).id;

  const bob = await registerUser({
    username: BOB_USERNAME,
    email: `${BOB_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  bobUserId = bob.id;
  bobProfileId = (await prisma.playerProfile.findUniqueOrThrow({ where: { userId: bobUserId } })).id;

  const carol = await registerUser({
    username: CAROL_USERNAME,
    email: `${CAROL_USERNAME}@example.com`,
    password: "TestPass123",
    confirmPassword: "TestPass123",
    agreedToTerms: true,
  });
  carolUserId = carol.id;
  carolProfileId = (await prisma.playerProfile.findUniqueOrThrow({ where: { userId: carolUserId } })).id;

  // Alice and Bob become friends; Carol stays a non-friend for the guard test.
  await sendFriendRequest(aliceUserId, BOB_USERNAME);
  const incoming = await listIncomingFriendRequests(bobUserId);
  await acceptFriendRequest(bobUserId, incoming[0].friendshipId);
});

afterAll(async () => {
  for (const userId of [aliceUserId, bobUserId, carolUserId].filter(Boolean)) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      const challenges = await prisma.friendChallenge.findMany({
        where: { OR: [{ challengerId: profile.id }, { opponentId: profile.id }] },
      });
      const tournamentIds = challenges.map((c) => c.tournamentId).filter((id): id is string => Boolean(id));
      await prisma.friendChallenge.deleteMany({ where: { OR: [{ challengerId: profile.id }, { opponentId: profile.id }] } });
      for (const tournamentId of tournamentIds) {
        await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
        await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
        await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
        await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
        await prisma.tournament.deleteMany({ where: { id: tournamentId } });
      }
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("friend challenge lifecycle", () => {
  it("rejects challenging a non-friend", async () => {
    await expect(sendChallenge(aliceUserId, carolProfileId)).rejects.toThrow(AppError);
  });

  it("rejects self-challenge", async () => {
    await expect(sendChallenge(aliceUserId, aliceProfileId)).rejects.toThrow(AppError);
  });

  it("sends a challenge from alice to bob and lists it on both sides", async () => {
    await sendChallenge(aliceUserId, bobProfileId);

    const outgoing = await listOutgoingChallenges(aliceUserId);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].to.displayName).toBe(BOB_USERNAME);

    const incoming = await listIncomingChallenges(bobUserId);
    expect(incoming).toHaveLength(1);
    expect(incoming[0].from.displayName).toBe(ALICE_USERNAME);
  });

  it("rejects a duplicate pending challenge between the same two players", async () => {
    await expect(sendChallenge(aliceUserId, bobProfileId)).rejects.toThrow(AppError);
    await expect(sendChallenge(bobUserId, aliceProfileId)).rejects.toThrow(AppError);
  });

  it("lets bob accept the challenge, creating a 2-player IN_PROGRESS tournament with a round-1 match", async () => {
    const incoming = await listIncomingChallenges(bobUserId);
    const { tournamentId } = await acceptChallenge(bobUserId, incoming[0].challengeId);

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: { participants: true, matches: true },
    });
    expect(tournament.maxPlayers).toBe(2);
    expect(tournament.status).toBe("IN_PROGRESS");
    expect(tournament.currentRound).toBe(1);
    expect(tournament.participants).toHaveLength(2);
    expect(tournament.participants.map((p) => p.playerId).sort()).toEqual([aliceProfileId, bobProfileId].sort());
    expect(tournament.matches).toHaveLength(1);
    expect(tournament.matches[0].round).toBe(1);

    const [aliceProfile, bobProfile] = await Promise.all([
      prisma.playerProfile.findUniqueOrThrow({ where: { id: aliceProfileId } }),
      prisma.playerProfile.findUniqueOrThrow({ where: { id: bobProfileId } }),
    ]);
    expect(aliceProfile.tournamentEntries).toBeGreaterThan(0);
    expect(bobProfile.tournamentEntries).toBeGreaterThan(0);
  });

  it("rejects sending a new challenge while a tournament from the last one is still active", async () => {
    await expect(sendChallenge(bobUserId, aliceProfileId)).rejects.toThrow(AppError);
  });
});

describe("declining a challenge", () => {
  it("lets either side decline a pending challenge", async () => {
    await sendFriendRequest(carolUserId, BOB_USERNAME);
    // carol is not bob's friend yet in this describe block's isolated state — accept it first.
    const req = await listIncomingFriendRequests(bobUserId);
    const carolRequest = req.find((r) => r.from.displayName === CAROL_USERNAME);
    if (carolRequest) await acceptFriendRequest(bobUserId, carolRequest.friendshipId);

    // sendChallenge only checks the sender's own active-tournament status, not the recipient's
    // (that's checked at accept time) — so carol can still send this even though bob is
    // mid-tournament with alice from the previous describe block.
    await sendChallenge(carolUserId, bobProfileId);
    const incoming = await listIncomingChallenges(bobUserId);
    const carolChallenge = incoming.find((c) => c.from.displayName === CAROL_USERNAME);
    expect(carolChallenge).toBeDefined();

    await declineChallenge(bobUserId, carolChallenge!.challengeId);
    const afterDecline = await listIncomingChallenges(bobUserId);
    expect(afterDecline.find((c) => c.from.displayName === CAROL_USERNAME)).toBeUndefined();
  });
});
