import { prisma } from "@/infrastructure/database/prisma";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";

export async function getTournamentView(userId: string, tournamentId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { league: true, participants: { include: { player: true, bot: true } } },
  });
  if (!tournament) throw new AppError("NOT_FOUND", "トーナメントが見つかりません。");

  const myParticipant = tournament.participants.find((p) => p.playerId === profile.id);
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
    leagueName: tournament.league.displayName,
    maxPlayers: tournament.maxPlayers,
    participantCount: tournament.participants.length,
    myParticipantId: myParticipant?.id ?? null,
    winnerParticipantId: tournament.winnerParticipantId,
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
