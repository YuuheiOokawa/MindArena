import { prisma } from "@/infrastructure/database/prisma";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { ParticipantType, PointReason, type BotDifficulty } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import { awardPoints } from "@/features/points/award-points.service";
import { fillWithBots } from "./bot-fill.service";
import { generateBracketForTournament } from "./progress.service";

/**
 * Joins (or resumes) a tournament for the given league. MVP has no live human matchmaking
 * queue (docs/09_TOURNAMENT_DESIGN.md), so the remaining 31 seats are filled with BOTs and the
 * bracket is generated immediately — this keeps the "insufficient participants get BOT-filled"
 * requirement true without a real-time lobby.
 */
export async function joinTournament(userId: string, leagueId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const league = await leagueRepository.findById(leagueId);
  if (!league || !league.isActive) throw new AppError("NOT_FOUND", "リーグが見つかりません。");
  if (profile.totalPoints < league.requiredPoints) {
    throw new AppError("TOURNAMENT_NOT_JOINABLE", "このリーグはまだ解放されていません。");
  }

  const active = await tournamentRepository.findActiveForPlayer(profile.id);
  if (active) return active;

  const tournament = await tournamentRepository.create(leagueId, 32);

  await tournamentParticipantRepository.createMany([
    { tournamentId: tournament.id, playerId: profile.id, type: ParticipantType.HUMAN, displayName: profile.displayName, seed: 1 },
  ]);

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.playerProfile.findUniqueOrThrow({ where: { id: profile.id } });
    await awardPoints(tx, {
      playerProfileId: profile.id,
      currentPoints: fresh.totalPoints,
      reason: PointReason.TOURNAMENT_ENTRY,
      league,
      tournamentId: tournament.id,
      leagueId: league.id,
    });
    await tx.playerProfile.update({ where: { id: profile.id }, data: { tournamentEntries: { increment: 1 } } });
  });

  await fillWithBots(tournament.id, league.botDifficulty as BotDifficulty, tournament.maxPlayers);
  await generateBracketForTournament(tournament.id);

  return tournamentRepository.findById(tournament.id);
}
