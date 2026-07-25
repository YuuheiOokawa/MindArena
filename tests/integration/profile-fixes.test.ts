import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { joinTournament } from "@/features/tournaments/join.service";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { updateMyCosmetics } from "@/features/profiles/update-profile.service";
import { ParticipantStatus, ParticipantType } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
const LEAGUE_USERNAME = `fix_league_${RUN_ID}`;
const TITLE_USERNAME = `fix_title_${RUN_ID}`;
const ELIM_USERNAME = `fix_elim_${RUN_ID}`;

let leagueUserId: string;
let titleUserId: string;
let elimUserId: string;
const createdTournamentIds: string[] = [];

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) {
    throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  }

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

  [leagueUserId, titleUserId, elimUserId] = await Promise.all([
    register(LEAGUE_USERNAME),
    register(TITLE_USERNAME),
    register(ELIM_USERNAME),
  ]);
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const userId of [leagueUserId, titleUserId, elimUserId].filter(Boolean)) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("currentLeagueId stays in sync with totalPoints", () => {
  it("updates currentLeagueId the moment a point award crosses into a higher league", async () => {
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: leagueUserId } });
    const bronze = await prisma.league.findFirstOrThrow({ where: { code: "BRONZE" } });
    const gold = await prisma.league.findFirstOrThrow({ where: { code: "GOLD" } });
    expect(profile.currentLeagueId).toBe(bronze.id);

    // Simulate having already earned enough points to be in GOLD without ever going through the
    // (now-fixed) sync path, then trigger any point award — joinTournament's TOURNAMENT_ENTRY —
    // to confirm the award itself is what re-syncs currentLeagueId, not just registration.
    await prisma.playerProfile.update({ where: { id: profile.id }, data: { totalPoints: gold.requiredPoints + 50 } });

    const tournament = await joinTournament(leagueUserId, gold.id);
    createdTournamentIds.push(tournament!.id);

    const fresh = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect(fresh.currentLeagueId).toBe(gold.id);
  });
});

describe("selectedTitleId is validated against actual unlock conditions", () => {
  it("allows the always-unlocked starting title", async () => {
    await expect(updateMyCosmetics(titleUserId, { selectedTitleId: "novice" })).resolves.toBeDefined();
  });

  it("rejects a title the player hasn't earned", async () => {
    await expect(updateMyCosmetics(titleUserId, { selectedTitleId: "champion" })).rejects.toThrow(AppError);
  });

  it("rejects an unknown title id", async () => {
    await expect(updateMyCosmetics(titleUserId, { selectedTitleId: "not-a-real-title" })).rejects.toThrow(AppError);
  });

  it("allows a title once its condition is actually met", async () => {
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: titleUserId } });
    await prisma.playerProfile.update({ where: { id: profile.id }, data: { totalWins: 1 } });

    await expect(updateMyCosmetics(titleUserId, { selectedTitleId: "first-blood" })).resolves.toBeDefined();
  });
});

describe("findActiveForPlayer only counts a still-live seat", () => {
  it("returns null once the player's participant row is ELIMINATED, even while the tournament itself is still IN_PROGRESS", async () => {
    const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: elimUserId } });
    const bronze = await prisma.league.findFirstOrThrow({ where: { code: "BRONZE" } });
    const tournament = await tournamentRepository.create(bronze.id, 2);
    createdTournamentIds.push(tournament.id);
    await tournamentRepository.update(tournament.id, { status: "IN_PROGRESS" });

    await tournamentParticipantRepository.createMany([
      { tournamentId: tournament.id, playerId: profile.id, type: ParticipantType.HUMAN, displayName: "elim-tester", seed: 1 },
    ]);

    const beforeElimination = await tournamentRepository.findActiveForPlayer(profile.id);
    expect(beforeElimination?.id).toBe(tournament.id);

    const participant = await prisma.tournamentParticipant.findFirstOrThrow({ where: { tournamentId: tournament.id, playerId: profile.id } });
    await prisma.tournamentParticipant.update({ where: { id: participant.id }, data: { status: ParticipantStatus.ELIMINATED } });

    const afterElimination = await tournamentRepository.findActiveForPlayer(profile.id);
    expect(afterElimination).toBeNull();
  });
});
