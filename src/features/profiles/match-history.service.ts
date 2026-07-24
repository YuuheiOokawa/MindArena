import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";

export async function getMyMatchHistory(userId: string, cursor?: string, limit = 20) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const participantRows = await prisma.tournamentParticipant.findMany({
    where: { playerId: profile.id },
    select: { id: true },
  });
  const participantIds = participantRows.map((p) => p.id);

  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ player1ParticipantId: { in: participantIds } }, { player2ParticipantId: { in: participantIds } }],
    },
    orderBy: { completedAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      player1: true,
      player2: true,
      gameType: true,
      result: true,
      tournament: { include: { league: true } },
    },
  });

  return matches.map((match) => {
    const myParticipantId = participantIds.find(
      (id) => id === match.player1ParticipantId || id === match.player2ParticipantId,
    )!;
    const isPlayer1 = match.player1ParticipantId === myParticipantId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    const won = match.winnerParticipantId === myParticipantId;

    return {
      matchId: match.id,
      completedAt: match.completedAt,
      gameName: match.gameType.name,
      opponentName: opponent?.displayName ?? "不明な相手",
      opponentIsBot: opponent?.type === "BOT",
      leagueName: match.tournament.league.displayName,
      won,
      myScore: isPlayer1 ? match.result?.player1Score : match.result?.player2Score,
      opponentScore: isPlayer1 ? match.result?.player2Score : match.result?.player1Score,
      round: match.round,
    };
  });
}
