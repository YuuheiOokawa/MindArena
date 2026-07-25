import { prisma } from "@/infrastructure/database/prisma";
import { calculateWinRate } from "@/domain/services/win-rate.util";
import { getMyParticipantIdForMatch } from "./participant-lookup";
import { AppError } from "@/lib/errors/app-error";

export async function getMatchPreview(userId: string, matchId: string) {
  const myParticipantId = await getMyParticipantIdForMatch(userId, matchId);

  const match = await prisma.tournamentMatch.findUniqueOrThrow({
    where: { id: matchId },
    include: {
      player1: { include: { player: { include: { currentLeague: true, user: { select: { username: true } } } }, bot: true } },
      player2: { include: { player: { include: { currentLeague: true, user: { select: { username: true } } } }, bot: true } },
      gameType: true,
      tournament: { include: { league: true } },
    },
  });

  const me = match.player1?.id === myParticipantId ? match.player1 : match.player2;
  const opponent = match.player1?.id === myParticipantId ? match.player2 : match.player1;
  if (!opponent || !me) throw new AppError("MATCH_NOT_READY", "対戦相手がまだ決まっていません。");

  const opponentWinRate = opponent.player ? calculateWinRate(opponent.player.totalWins, opponent.player.totalMatches) : null;
  const myWinRate = me.player ? calculateWinRate(me.player.totalWins, me.player.totalMatches) : null;

  return {
    matchId: match.id,
    myParticipantId,
    round: match.round,
    matchNumber: match.matchNumber,
    gameName: match.gameType.name,
    gameId: match.gameType.code.toLowerCase().replace(/_/g, "-"),
    tournamentLeagueName: match.tournament.league.displayName,
    me: {
      displayName: me.displayName,
      username: me.player?.user.username ?? null,
      leagueName: me.player?.currentLeague.displayName ?? null,
      leagueThemeKey: me.player?.currentLeague.themeKey ?? null,
      avatarIconId: me.player?.selectedAvatarIconId ?? null,
      photoUrl: me.player?.customAvatarUrl ?? null,
      winRate: myWinRate,
    },
    opponent: {
      participantId: opponent.id,
      displayName: opponent.displayName,
      // Every human opponent you can face is a friend — there's no random matchmaking in this
      // app, only self, invited friends, and bots — so the username is always safe to show here.
      username: opponent.player?.user.username ?? null,
      isBot: opponent.type === "BOT",
      leagueName: opponent.player?.currentLeague.displayName ?? null,
      leagueThemeKey: opponent.player?.currentLeague.themeKey ?? null,
      avatarIconId: opponent.player?.selectedAvatarIconId ?? null,
      photoUrl: opponent.player?.customAvatarUrl ?? null,
      winRate: opponentWinRate,
      totalMatches: opponent.player?.totalMatches ?? null,
    },
  };
}
