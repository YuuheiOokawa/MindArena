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

/**
 * The running (cumulative) win rate sampled at up to `sampleCount` evenly-spaced points across
 * the player's completed-match history, oldest first — powers the profile screen's trend line.
 * Returns an empty array with fewer than 2 completed matches (nothing meaningful to trend).
 */
export async function getMyWinRateTrend(userId: string, sampleCount = 8) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const participantRows = await prisma.tournamentParticipant.findMany({
    where: { playerId: profile.id },
    select: { id: true },
  });
  const participantIds = participantRows.map((p) => p.id);
  if (participantIds.length === 0) return [];

  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ player1ParticipantId: { in: participantIds } }, { player2ParticipantId: { in: participantIds } }],
    },
    orderBy: { completedAt: "asc" },
    select: { completedAt: true, winnerParticipantId: true, player1ParticipantId: true, player2ParticipantId: true },
  });

  if (matches.length < 2) return [];

  let wins = 0;
  const cumulative = matches.map((match, index) => {
    const myParticipantId = participantIds.includes(match.player1ParticipantId ?? "")
      ? match.player1ParticipantId
      : match.player2ParticipantId;
    if (match.winnerParticipantId === myParticipantId) wins += 1;
    return {
      date: (match.completedAt ?? new Date()).toISOString(),
      winRate: Math.round((wins / (index + 1)) * 100),
    };
  });

  if (cumulative.length <= sampleCount) return cumulative;

  const step = (cumulative.length - 1) / (sampleCount - 1);
  return Array.from({ length: sampleCount }, (_, i) => cumulative[Math.round(i * step)]);
}
