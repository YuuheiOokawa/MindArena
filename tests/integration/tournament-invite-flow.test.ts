import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { joinTournament, createFriendTournament } from "@/features/tournaments/join.service";
import {
  listIncomingTournamentInvites,
  acceptTournamentInvite,
  declineTournamentInvite,
  startTournamentNow,
  finalizeIfDue,
} from "@/features/tournaments/invite.service";
import { AppError } from "@/lib/errors/app-error";
import { TournamentStatus } from "@/domain/enums";

/**
 * Integration tests for the tournament-invite lifecycle: joining a tournament auto-invites
 * eligible friends (same league or higher, no active tournament of their own) and leaves the
 * tournament RECRUITING instead of instantly BOT-filling, so an invited friend has a real window
 * to join the SAME bracket. Exercises the whole thing against a real Postgres database.
 *
 * Each scenario below allocates its OWN fresh users rather than reusing one across scenarios —
 * once a user's tournament finalizes to IN_PROGRESS they become "active" and both stop being
 * invitable (findInvitableFriends excludes active players) and can't join/create another
 * tournament themselves, so reusing a "joiner" across scenarios silently breaks whichever ran
 * later. Isolation avoids that entirely.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `tinv_${name}_${RUN_ID}`;
}

const createdTournamentIds: string[] = [];
const createdUserIds: string[] = [];

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

async function cleanupTournament(tournamentId: string) {
  await prisma.tournamentInvite.deleteMany({ where: { tournamentId } });
  await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
  await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
  await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
  await prisma.tournament.deleteMany({ where: { id: tournamentId } });
}

let bronzeLeagueId: string;

let alice: { userId: string; profileId: string };
let bob: { userId: string; profileId: string };
let carol: { userId: string; profileId: string };
let dave: { userId: string; profileId: string };
let eve: { userId: string; profileId: string };
let frank: { userId: string; profileId: string };
let grace: { userId: string; profileId: string };
let henry: { userId: string; profileId: string };
let ivan: { userId: string; profileId: string };
let julia: { userId: string; profileId: string };
let kevin: { userId: string; profileId: string };

beforeAll(async () => {
  const bronze = await prisma.league.findFirst({ where: { code: "BRONZE" } });
  if (!bronze) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  bronzeLeagueId = bronze.id;

  [alice, bob, carol, dave, eve, frank, grace, henry, ivan, julia, kevin] = await Promise.all([
    makeUser("alice"),
    makeUser("bob"),
    makeUser("carol"),
    makeUser("dave"),
    makeUser("eve"),
    makeUser("frank"),
    makeUser("grace"),
    makeUser("henry"),
    makeUser("ivan"),
    makeUser("julia"),
    makeUser("kevin"),
  ]);

  await befriend(alice.userId, username("bob"), bob.userId);
  await befriend(alice.userId, username("carol"), carol.userId);
  await befriend(eve.userId, username("frank"), frank.userId);
  await befriend(grace.userId, username("henry"), henry.userId);
  await befriend(ivan.userId, username("julia"), julia.userId);
  await befriend(ivan.userId, username("kevin"), kevin.userId);
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await cleanupTournament(tournamentId);
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("joining a tournament auto-invites eligible friends", () => {
  it("leaves the tournament RECRUITING and invites friends instead of instant BOT-fill", async () => {
    const tournament = await joinTournament(alice.userId, bronzeLeagueId);
    createdTournamentIds.push(tournament!.id);

    expect(tournament!.status).toBe(TournamentStatus.RECRUITING);

    const bobInvites = await listIncomingTournamentInvites(bob.userId);
    expect(bobInvites.some((i) => i.tournamentId === tournament!.id)).toBe(true);

    const carolInvites = await listIncomingTournamentInvites(carol.userId);
    expect(carolInvites.some((i) => i.tournamentId === tournament!.id)).toBe(true);
  });

  it("lets an invited friend accept and join the SAME tournament as a real participant", async () => {
    const invites = await listIncomingTournamentInvites(bob.userId);
    const invite = invites[invites.length - 1];

    const { tournamentId } = await acceptTournamentInvite(bob.userId, invite.inviteId);

    const participants = await prisma.tournamentParticipant.findMany({ where: { tournamentId } });
    const humanParticipants = participants.filter((p) => p.playerId != null);
    expect(humanParticipants.map((p) => p.playerId).sort()).toEqual([alice.profileId, bob.profileId].sort());

    const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    expect(tournament.status).toBe(TournamentStatus.RECRUITING);
  });

  it("lets the other invited friend decline without affecting the tournament", async () => {
    const invites = await listIncomingTournamentInvites(carol.userId);
    const invite = invites[invites.length - 1];
    await declineTournamentInvite(carol.userId, invite.inviteId);

    const afterDecline = await listIncomingTournamentInvites(carol.userId);
    expect(afterDecline.find((i) => i.inviteId === invite.inviteId)).toBeUndefined();
  });

  it("rejects start-now from a non-creator participant", async () => {
    const tournament = await prisma.tournament.findFirstOrThrow({
      where: { id: { in: createdTournamentIds } },
      orderBy: { createdAt: "desc" },
    });
    await expect(startTournamentNow(bob.userId, tournament.id)).rejects.toThrow(AppError);
  });

  it("lets the creator start now, BOT-filling the rest and generating the bracket", async () => {
    const tournament = await prisma.tournament.findFirstOrThrow({
      where: { id: { in: createdTournamentIds } },
      orderBy: { createdAt: "desc" },
    });
    await startTournamentNow(alice.userId, tournament.id);

    const finalized = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id }, include: { participants: true } });
    expect(finalized.status).toBe(TournamentStatus.IN_PROGRESS);
    expect(finalized.participants).toHaveLength(32);

    // Nobody's left with a stale PENDING invite to a lobby that's already started.
    const stalePending = await prisma.tournamentInvite.count({ where: { tournamentId: tournament.id, status: "PENDING" } });
    expect(stalePending).toBe(0);
  });
});

describe("a player with no eligible friends joins instantly, unchanged from before", () => {
  it("BOT-fills and starts immediately when nobody is invited", async () => {
    const tournament = await joinTournament(dave.userId, bronzeLeagueId);
    createdTournamentIds.push(tournament!.id);

    const finalized = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament!.id }, include: { participants: true } });
    expect(finalized.status).toBe(TournamentStatus.IN_PROGRESS);
    expect(finalized.participants).toHaveLength(32);
  });
});

describe("finalizeIfDue", () => {
  it("finalizes a RECRUITING tournament once its recruiting window has elapsed", async () => {
    const tournament = await joinTournament(eve.userId, bronzeLeagueId);
    createdTournamentIds.push(tournament!.id);
    expect(tournament!.status).toBe(TournamentStatus.RECRUITING);

    // Simulate the recruiting window having elapsed instead of actually waiting for it in real time.
    await prisma.tournament.update({
      where: { id: tournament!.id },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });

    await finalizeIfDue(tournament!.id);

    const finalized = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament!.id } });
    expect(finalized.status).toBe(TournamentStatus.IN_PROGRESS);
  });

  it("does not finalize a RECRUITING tournament before the window elapses", async () => {
    const tournament = await joinTournament(grace.userId, bronzeLeagueId);
    createdTournamentIds.push(tournament!.id);
    expect(tournament!.status).toBe(TournamentStatus.RECRUITING);

    await finalizeIfDue(tournament!.id);

    const stillRecruiting = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament!.id } });
    expect(stillRecruiting.status).toBe(TournamentStatus.RECRUITING);
  });
});

describe("createFriendTournament (manual friend-only lobby)", () => {
  it("invites only the hand-picked friends, not every eligible one", async () => {
    const tournament = await createFriendTournament(ivan.userId, bronzeLeagueId, [julia.profileId]);
    createdTournamentIds.push(tournament!.id);

    const juliaInvites = await listIncomingTournamentInvites(julia.userId);
    expect(juliaInvites.some((i) => i.tournamentId === tournament!.id)).toBe(true);

    const kevinInvites = await listIncomingTournamentInvites(kevin.userId);
    expect(kevinInvites.some((i) => i.tournamentId === tournament!.id)).toBe(false);

    await startTournamentNow(ivan.userId, tournament!.id);
  });

  it("rejects an empty invite list", async () => {
    await expect(createFriendTournament(ivan.userId, bronzeLeagueId, [])).rejects.toThrow(AppError);
  });
});
