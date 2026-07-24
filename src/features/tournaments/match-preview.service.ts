import { prisma } from "@/infrastructure/database/prisma";
import { calculateWinRate } from "@/domain/services/win-rate.util";
import { getMyParticipantIdForMatch } from "./participant-lookup";
import { AppError } from "@/lib/errors/app-error";

export async function getMatchPreview(userId: string, matchId: string) {
  const myParticipantId = await getMyParticipantIdForMatch(userId, matchId);

  const match = await prisma.tournamentMatch.findUniqueOrThrow({
    where: { id: matchId },
    include: {
      player1: { include: { player: { include: { currentLeague: true } }, bot: true } },
      player2: { include: { player: { include: { currentLeague: true } }, bot: true } },
      gameType: true,
      tournament: { include: { league: true } },
    },
  });

  const opponent = match.player1?.id === myParticipantId ? match.player2 : match.player1;
  if (!opponent) throw new AppError("MATCH_NOT_READY", "対戦相手がまだ決まっていません。");

  const opponentWinRate = opponent.player ? calculateWinRate(opponent.player.totalWins, opponent.player.totalMatches) : null;

  return {
    matchId: match.id,
    myParticipantId,
    round: match.round,
    gameName: match.gameType.name,
    gameId: match.gameType.code.toLowerCase().replace(/_/g, "-"),
    tournamentLeagueName: match.tournament.league.displayName,
    opponent: {
      participantId: opponent.id,
      displayName: opponent.displayName,
      isBot: opponent.type === "BOT",
      leagueName: opponent.player?.currentLeague.displayName ?? null,
      winRate: opponentWinRate,
      totalMatches: opponent.player?.totalMatches ?? null,
    },
  };
}
