import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { withKeyLock } from "@/infrastructure/repositories/advisory-lock.repository";
import { forfeitMatch } from "./progress.service";
import { ParticipantStatus, TournamentStatus } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

/**
 * Lets a player voluntarily leave (棄権) a tournament they're still active in, instead of being
 * stuck until they either win the whole thing or get eliminated.
 *
 * - Still RECRUITING (nobody's playing yet, no bracket exists): the creator leaving cancels the
 *   whole lobby; anyone else leaving just removes their own seat and recruiting continues.
 * - IN_PROGRESS with a live match right now: that match is forfeited immediately — the opponent
 *   wins exactly as if the withdrawing player had lost normally (points/elimination/bracket
 *   advancement all follow the same path a real loss would).
 * - IN_PROGRESS with no live match right now (already won this round, waiting on the round's
 *   other match(es) to finish before the next one is generated): marked WITHDRAWN immediately:
 *   progress.service.ts's resolveWithdrawnMatchesForRound auto-forfeits their next match the
 *   instant it's created, so their future opponent is never left waiting on a no-show.
 */
export async function withdrawFromTournament(userId: string, tournamentId: string) {
  const profile = await requireProfile(userId);
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) throw new AppError("NOT_FOUND", "トーナメントが見つかりませんでした。");

  const myParticipant = tournament.participants.find((p) => p.playerId === profile.id);
  if (!myParticipant) throw new AppError("NOT_FOUND", "この大会に参加していません。");
  if (myParticipant.status !== ParticipantStatus.ACTIVE) {
    throw new AppError("CONFLICT", "すでにこの大会から離脱しています。");
  }

  if (tournament.status === TournamentStatus.RECRUITING) {
    await withKeyLock(tournamentId, async () => {
      const isCreator = myParticipant.seed === 1;
      if (isCreator) {
        await tournamentRepository.update(tournamentId, { status: TournamentStatus.CANCELLED });
        await tournamentParticipantRepository.deleteAllForTournament(tournamentId);
        await tournamentInviteRepository.expireAllPending(tournamentId);
      } else {
        await tournamentParticipantRepository.delete(myParticipant.id);
      }
    });
    return { left: true };
  }

  if (tournament.status !== TournamentStatus.IN_PROGRESS) {
    throw new AppError("CONFLICT", "この大会はすでに終了しています。");
  }

  await tournamentParticipantRepository.markWithdrawn(myParticipant.id);

  const liveMatch = await tournamentMatchRepository.findForPlayer(tournamentId, myParticipant.id);
  if (liveMatch) {
    await forfeitMatch(liveMatch.id, myParticipant.id);
  }

  return { left: true };
}
