import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { verifyPassword } from "@/infrastructure/auth/password";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { joinTournament } from "@/features/tournaments/join.service";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";

/**
 * Integration tests run against a real Postgres database (the same one used for local dev —
 * see README "テスト実行方法"). They exercise the full stack: register -> login credential
 * check -> tournament join -> BOT fill -> bracket generation -> BOT-vs-BOT auto-resolution.
 */

const TEST_USERNAME = `it_user_${Date.now()}`;
const TEST_EMAIL = `${TEST_USERNAME}@example.com`;

let createdUserId: string;

afterAll(async () => {
  if (createdUserId) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId: createdUserId } });
    if (profile) {
      const participants = await prisma.tournamentParticipant.findMany({ where: { playerId: profile.id } });
      const tournamentIds = [...new Set(participants.map((p) => p.tournamentId))];
      for (const tournamentId of tournamentIds) {
        await prisma.gameAction.deleteMany({ where: { gameSession: { tournamentMatch: { tournamentId } } } });
        await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
        await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
        await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
        await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
        await prisma.tournament.deleteMany({ where: { id: tournamentId } });
      }
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.playerGameStats.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId: createdUserId } });
    await prisma.user.deleteMany({ where: { id: createdUserId } });
  }
  await prisma.$disconnect();
});

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) {
    throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  }
});

describe("registration and login", () => {
  it("creates a User + PlayerProfile with a hashed (never plaintext) password", async () => {
    const user = await registerUser({
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: "TestPass123",
      confirmPassword: "TestPass123",
      agreedToTerms: true,
    });
    createdUserId = user.id;

    const row = await userRepository.findByUsername(TEST_USERNAME);
    expect(row).not.toBeNull();
    expect(row!.passwordHash).not.toBe("TestPass123");
    expect(await verifyPassword("TestPass123", row!.passwordHash)).toBe(true);

    const profile = await playerProfileRepository.findByUserId(user.id);
    expect(profile).not.toBeNull();
    expect(profile!.totalPoints).toBe(0);
  });

  it("allows lookup by username OR email (the login flow's resolution step)", async () => {
    const byUsername = await userRepository.findByUsernameOrEmail(TEST_USERNAME);
    const byEmail = await userRepository.findByUsernameOrEmail(TEST_EMAIL);
    expect(byUsername?.id).toBe(createdUserId);
    expect(byEmail?.id).toBe(createdUserId);
  });

  it("rejects a duplicate username", async () => {
    await expect(
      registerUser({
        username: TEST_USERNAME,
        email: `different-${TEST_EMAIL}`,
        password: "TestPass123",
        confirmPassword: "TestPass123",
        agreedToTerms: true,
      }),
    ).rejects.toThrow();
  });
});

describe("tournament join, BOT fill, and bracket generation", () => {
  it("fills the remaining seats with BOTs and generates a 32-player round-1 bracket", async () => {
    const league = await prisma.league.findFirstOrThrow({ where: { code: "BRONZE" } });
    const tournament = await joinTournament(createdUserId, league.id);
    expect(tournament).not.toBeNull();
    expect(tournament!.status).toBe("IN_PROGRESS");

    const participants = await prisma.tournamentParticipant.findMany({ where: { tournamentId: tournament!.id } });
    expect(participants).toHaveLength(32);
    expect(participants.filter((p) => p.type === "HUMAN")).toHaveLength(1);
    expect(participants.filter((p) => p.type === "BOT")).toHaveLength(31);

    const matches = await tournamentMatchRepository.listForRound(tournament!.id, 1);
    expect(matches).toHaveLength(16);

    // Every match not involving the human should already be auto-resolved by BOT simulation.
    const profile = await playerProfileRepository.findByUserId(createdUserId);
    const humanParticipant = participants.find((p) => p.playerId === profile!.id)!;
    const botOnlyMatches = matches.filter(
      (m) => m.player1ParticipantId !== humanParticipant.id && m.player2ParticipantId !== humanParticipant.id,
    );
    expect(botOnlyMatches.every((m) => m.status === "COMPLETED")).toBe(true);

    const humanMatch = matches.find(
      (m) => m.player1ParticipantId === humanParticipant.id || m.player2ParticipantId === humanParticipant.id,
    );
    expect(humanMatch).toBeDefined();
    expect(humanMatch!.status).toBe("READY");
  });

  it("prevents the same player from double-joining (returns the existing tournament instead)", async () => {
    const league = await prisma.league.findFirstOrThrow({ where: { code: "BRONZE" } });
    const first = await joinTournament(createdUserId, league.id);
    const second = await joinTournament(createdUserId, league.id);
    expect(second!.id).toBe(first!.id);
  });

  it("awarded TOURNAMENT_ENTRY points exactly once", async () => {
    const profile = await playerProfileRepository.findByUserId(createdUserId);
    const entryTransactions = await prisma.pointTransaction.findMany({
      where: { playerProfileId: profile!.id, reason: "TOURNAMENT_ENTRY" },
    });
    expect(entryTransactions).toHaveLength(1);
    expect(profile!.tournamentEntries).toBe(1);
  });
});
