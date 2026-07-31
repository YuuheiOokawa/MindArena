import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { getEventDetail, listEvents, claimEventMilestone } from "@/features/events/event.service";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `ev_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];
const createdTournamentIds: string[] = [];
let eventId: string;
let milestoneOneWinId: string;
let milestoneTwoWinsId: string;

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id };
}

async function befriend(userIdA: string, usernameB: string, userIdB: string) {
  await sendFriendRequest(userIdA, usernameB);
  const incoming = await listIncomingFriendRequests(userIdB);
  await acceptFriendRequest(userIdB, incoming[0].friendshipId);
}

async function playFriendMatch(winnerUserId: string, winnerProfileId: string, loserUserId: string, loserUsername: string, loserProfileId: string) {
  await befriend(winnerUserId, loserUsername, loserUserId);
  await sendChallenge(winnerUserId, loserProfileId);
  const incoming = await listIncomingChallenges(loserUserId);
  const { tournamentId } = await acceptChallenge(loserUserId, incoming[0].challengeId);
  createdTournamentIds.push(tournamentId);

  const match = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId } });
  const [p1, p2] = await Promise.all([
    prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player1ParticipantId! } }),
    prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player2ParticipantId! } }),
  ]);
  const winnerParticipant = [p1, p2].find((p) => p.playerId === winnerProfileId)!;
  const loserParticipant = [p1, p2].find((p) => p.playerId === loserProfileId)!;

  await finalizeMatchResult(
    match.id,
    { gameId: "trust-or-betray", sessionId: match.id, winnerParticipantId: winnerParticipant.id, loserParticipantId: loserParticipant.id, isDraw: false, finalScores: {}, rounds: [] },
    0,
    0,
  );
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");

  // A dedicated, always-active test event (independent of config/events.ts's real dated event) so
  // this suite doesn't depend on the calendar — eventRepository.findAllActive() is TTL-cached, but
  // vitest isolates each test file's module graph, so creating this before any event-service call
  // in THIS file guarantees the first (cache-populating) read already includes it.
  const event = await prisma.event.create({
    data: {
      code: `EVENT_TEST_${RUN_ID}`,
      name: "テストイベント",
      description: "統合テスト用の常時開催イベント。",
      themeKey: "test",
      startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      milestones: {
        create: [
          { code: "WINS_1", name: "1勝達成", requiredScore: 1, rewardPoints: 50, rewardPrizeCurrency: 20, sortOrder: 1 },
          { code: "WINS_2", name: "2勝達成", requiredScore: 2, rewardPoints: 100, rewardPrizeCurrency: 40, sortOrder: 2 },
        ],
      },
    },
    include: { milestones: true },
  });
  eventId = event.id;
  milestoneOneWinId = event.milestones.find((m) => m.code === "WINS_1")!.id;
  milestoneTwoWinsId = event.milestones.find((m) => m.code === "WINS_2")!.id;
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.eventMilestoneClaim.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.eventScore.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.eventMilestoneClaim.deleteMany({ where: { eventMilestoneId: { in: [milestoneOneWinId, milestoneTwoWinsId] } } });
  await prisma.eventScore.deleteMany({ where: { eventId } });
  await prisma.eventMilestone.deleteMany({ where: { eventId } });
  await prisma.event.deleteMany({ where: { id: eventId } });
  await prisma.$disconnect();
});

describe("events", () => {
  it("starts at zero score with no milestones claimable", async () => {
    const alice = await makeUser("alice");
    const events = await listEvents(alice.userId);
    const mine = events.find((e) => e.id === eventId)!;
    expect(mine.myScore).toBe(0);
    expect(mine.claimableCount).toBe(0);
    expect(mine.status).toBe("ACTIVE");
  });

  it("credits the winner's event score by 1 per win, not the loser's", async () => {
    const bob = await makeUser("bob");
    const carol = await makeUser("carol");

    await playFriendMatch(bob.userId, bob.profileId, carol.userId, username("carol"), carol.profileId);

    const bobDetail = await getEventDetail(bob.userId, eventId);
    expect(bobDetail.myScore).toBe(1);
    expect(bobDetail.milestones.find((m) => m.code === "WINS_1")?.completed).toBe(true);
    expect(bobDetail.milestones.find((m) => m.code === "WINS_1")?.claimed).toBe(false);

    const carolDetail = await getEventDetail(carol.userId, eventId);
    expect(carolDetail.myScore).toBe(0);
  });

  it("pays out a milestone reward on claim, rejects claiming before the threshold and rejects double-claims", async () => {
    const dave = await makeUser("dave");
    const erin = await makeUser("erin");

    // dave has 0 wins yet — claiming WINS_1 must fail.
    await expect(claimEventMilestone(dave.userId, eventId, "WINS_1")).rejects.toThrow(AppError);

    await playFriendMatch(dave.userId, dave.profileId, erin.userId, username("erin"), erin.profileId);

    const before = await prisma.playerProfile.findUniqueOrThrow({ where: { id: dave.profileId } });
    await claimEventMilestone(dave.userId, eventId, "WINS_1");
    const after = await prisma.playerProfile.findUniqueOrThrow({ where: { id: dave.profileId } });
    expect(after.totalPoints - before.totalPoints).toBe(50);
    expect(after.prizeCurrency - before.prizeCurrency).toBe(20);

    // Already claimed.
    await expect(claimEventMilestone(dave.userId, eventId, "WINS_1")).rejects.toThrow(AppError);
    // Not yet reached (only 1 win so far).
    await expect(claimEventMilestone(dave.userId, eventId, "WINS_2")).rejects.toThrow(AppError);
  });

  it("only lets one of two concurrent claims for the same milestone succeed", async () => {
    const frank = await makeUser("frank");
    const grace = await makeUser("grace");
    await playFriendMatch(frank.userId, frank.profileId, grace.userId, username("grace"), grace.profileId);

    const results = await Promise.allSettled([
      claimEventMilestone(frank.userId, eventId, "WINS_1"),
      claimEventMilestone(frank.userId, eventId, "WINS_1"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const claims = await prisma.eventMilestoneClaim.findMany({ where: { playerProfileId: frank.profileId, eventMilestoneId: milestoneOneWinId } });
    expect(claims).toHaveLength(1);
  });
});
