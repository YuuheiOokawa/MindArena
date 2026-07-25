import { prisma } from "@/infrastructure/database/prisma";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { tournamentInviteRepository } from "@/infrastructure/repositories/tournament-invite.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";
import { BASE_CHAMPION_PRIZE } from "@/config/points";
import { TournamentStatus } from "@/domain/enums";
import { finalizeIfDue } from "./invite.service";

export async function getTournamentView(userId: string, tournamentId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  // Opportunistic finalize: a RECRUITING tournament nobody has re-fetched since its recruiting
  // window elapsed just sits there until the next poll — this IS that check, run before we read
  // the tournament back out so a client polling this endpoint always sees up-to-date status.
  await finalizeIfDue(tournamentId);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { league: true, participants: { include: { player: true, bot: true } } },
  });
  if (!tournament) throw new AppError("NOT_FOUND", "トーナメントが見つかりません。");

  const myParticipant = tournament.participants.find((p) => p.playerId === profile.id);
  const isCreator = tournament.participants.find((p) => p.seed === 1)?.playerId === profile.id;
  const pendingInvites =
    tournament.status === TournamentStatus.RECRUITING
      ? await tournamentInviteRepository.countPendingForTournament(tournamentId)
      : 0;
  const matches = await tournamentMatchRepository.listForTournament(tournamentId);

  const rounds = new Map<number, typeof matches>();
  for (const match of matches) {
    const bucket = rounds.get(match.round) ?? [];
    bucket.push(match);
    rounds.set(match.round, bucket);
  }

  return {
    id: tournament.id,
    status: tournament.status,
    currentRound: tournament.currentRound,
    leagueId: tournament.leagueId,
    leagueName: tournament.league.displayName,
    championPrize: Math.round(BASE_CHAMPION_PRIZE * tournament.league.rewardMultiplier),
    maxPlayers: tournament.maxPlayers,
    participantCount: tournament.participants.length,
    myParticipantId: myParticipant?.id ?? null,
    winnerParticipantId: tournament.winnerParticipantId,
    isCreator,
    pendingInvites,
    joinedPlayers: tournament.participants
      .filter((p) => p.type === "HUMAN")
      .map((p) => ({ name: p.displayName, isMe: p.playerId === profile.id })),
    rounds: Array.from(rounds.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches
          .sort((a, b) => a.matchNumber - b.matchNumber)
          .map((match) => ({
            id: match.id,
            matchNumber: match.matchNumber,
            status: match.status,
            player1: match.player1 ? { id: match.player1.id, name: match.player1.displayName, isBot: match.player1.type === "BOT" } : null,
            player2: match.player2 ? { id: match.player2.id, name: match.player2.displayName, isBot: match.player2.type === "BOT" } : null,
            winnerParticipantId: match.winnerParticipantId,
            involvesMe: Boolean(myParticipant) && (match.player1ParticipantId === myParticipant!.id || match.player2ParticipantId === myParticipant!.id),
          })),
      })),
  };
}
