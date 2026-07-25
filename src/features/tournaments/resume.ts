import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { gameSessionRepository } from "@/infrastructure/repositories/game-session.repository";
import { ParticipantStatus, TournamentStatus } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

export type ResumeScreen =
  | { screen: "home" }
  | { screen: "matchmaking"; tournamentId: string }
  | { screen: "bracket"; tournamentId: string }
  | { screen: "pre-match"; tournamentId: string; matchId: string }
  | { screen: "game"; tournamentId: string; matchId: string }
  | { screen: "champion"; tournamentId: string };

/**
 * Reconstructs where a reloading/returning player should land purely from server state
 * (source spec §29 — never trust client-only state for this). Called on entry to any
 * tournament-focused screen and on app resume.
 */
export async function resolveResumeState(userId: string): Promise<ResumeScreen> {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const tournament = await tournamentRepository.findLatestForPlayer(profile.id);
  if (!tournament || tournament.status === TournamentStatus.CANCELLED) return { screen: "home" };

  if (tournament.status === TournamentStatus.RECRUITING || tournament.status === TournamentStatus.READY) {
    return { screen: "matchmaking", tournamentId: tournament.id };
  }

  if (tournament.status === TournamentStatus.COMPLETED) {
    if (tournament.winnerParticipantId) {
      const winner = await prisma.tournamentParticipant.findUnique({ where: { id: tournament.winnerParticipantId } });
      if (winner?.playerId === profile.id) return { screen: "champion", tournamentId: tournament.id };
    }
    // Same dead-end as the eliminated-participant case below: a non-winner has nothing left to
    // resume into once the whole tournament is over (most visible in a 2-player friend battle,
    // where round 1 is also the final, so the tournament completes the instant the loser's match does).
    return { screen: "home" };
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: profile.id } },
  });

  // Eliminated (or otherwise no-longer-active) players have nothing left to resume into for this
  // tournament — routing them back to its bracket left "対戦を続ける" on Home permanently pointing
  // at a dead spectator view with no playable match, which reads as "can't continue" after a loss.
  if (!participant || participant.status !== ParticipantStatus.ACTIVE) {
    return { screen: "home" };
  }

  const match = await tournamentMatchRepository.findForPlayer(tournament.id, participant.id);
  if (!match) return { screen: "bracket", tournamentId: tournament.id };

  const session = await gameSessionRepository.findByMatchId(match.id);
  if (!session) return { screen: "pre-match", tournamentId: tournament.id, matchId: match.id };

  return { screen: "game", tournamentId: tournament.id, matchId: match.id };
}
