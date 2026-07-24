import { prisma } from "@/infrastructure/database/prisma";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";

/** Resolves the calling user's TournamentParticipant id for a specific match — the ownership anchor for every game/session API call. */
export async function getMyParticipantIdForMatch(userId: string, matchId: string): Promise<string> {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const match = await prisma.tournamentMatch.findUniqueOrThrow({
    where: { id: matchId },
    include: { player1: true, player2: true },
  });

  if (match.player1?.playerId === profile.id) return match.player1.id;
  if (match.player2?.playerId === profile.id) return match.player2.id;

  throw new AppError("FORBIDDEN", "この対戦の参加者ではありません。");
}
