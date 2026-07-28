import { prisma } from "@/infrastructure/database/prisma";
import { tournamentRepository } from "@/infrastructure/repositories/tournament.repository";
import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { gameTypeRepository } from "@/infrastructure/repositories/game-type.repository";
import { playerGameStatsRepository } from "@/infrastructure/repositories/player-game-stats.repository";
import { gameSessionRepository } from "@/infrastructure/repositories/game-session.repository";
import { achievementRepository } from "@/infrastructure/repositories/achievement.repository";
import { awardPoints } from "@/features/points/award-points.service";
import { simulateBotVsBotMatch } from "@/features/games/core/simulate-bot-match";
import { generateBracket, isFinalRound, pairNextRound } from "@/domain/services/bracket.service";
import { findNewlyMetAchievements } from "@/domain/services/achievement-check.service";
import { toJstDateKey } from "@/domain/services/daily-bonus.service";
import { hashStringToSeed } from "@/lib/utils/seeded-random";
import { MatchStatus, ParticipantStatus, ParticipantType, PointReason, TournamentStatus } from "@/domain/enums";
import { ROUND_CLEAR_REASON, ROUND_ELIMINATION_REASON } from "@/config/round-rewards";
import { DEFAULT_GAME_TIMERS } from "@/config/timers";
import { BASE_CHAMPION_PRIZE } from "@/config/points";
import { ACHIEVEMENTS } from "@/config/achievements";
import type { BotPlayer, GameContext, GameResult } from "@/domain/interfaces/psychological-game";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

function toBotPlayer(participantId: string, bot: { id: string; personality: string; judgment: number; deception: number; observation: number; riskTolerance: number; memory: number; randomness: number }): BotPlayer {
  return {
    participantId,
    botProfileId: bot.id,
    personality: bot.personality,
    judgment: bot.judgment,
    deception: bot.deception,
    observation: bot.observation,
    riskTolerance: bot.riskTolerance,
    memory: bot.memory,
    randomness: bot.randomness,
  };
}

/** Shuffles the participants and creates round-1 matches, then flips the tournament live. Called
 * once the roster is full — 32 for a normal league tournament, 2 for a friend challenge. */
export async function generateBracketForTournament(tournamentId: string) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament || tournament.status !== TournamentStatus.RECRUITING) return;

  const participants = await tournamentParticipantRepository.listForTournament(tournamentId);
  if (participants.length < tournament.maxPlayers) return;

  const gameTypes = await gameTypeRepository.findAllActive();
  const plans = generateBracket(
    participants.map((p) => ({ participantId: p.id, displayName: p.displayName })),
    hashStringToSeed(tournamentId),
  );

  // Each match randomly picks its own game from the 4 available (source spec §9 header note:
  // "トーナメントの各試合は4つのゲームからランダムで1つが選ばれる"), not one game per round.
  await tournamentMatchRepository.createMany(
    plans.map((plan) => ({
      tournamentId,
      round: plan.round,
      matchNumber: plan.matchNumber,
      player1ParticipantId: plan.participant1Id,
      player2ParticipantId: plan.participant2Id,
      gameTypeId: gameTypes[Math.floor(Math.random() * gameTypes.length)].id,
    })),
  );

  await tournamentRepository.update(tournamentId, {
    status: TournamentStatus.IN_PROGRESS,
    currentRound: 1,
    startedAt: new Date(),
  });

  await resolveBotVsBotMatchesForRound(tournamentId, 1);
  await resolveWithdrawnMatchesForRound(tournamentId, 1);
}

/** Simulates and finalizes every match in a round where both sides are BOTs. */
export async function resolveBotVsBotMatchesForRound(tournamentId: string, round: number) {
  const matches = await tournamentMatchRepository.listForRound(tournamentId, round);

  for (const match of matches) {
    if (match.status !== MatchStatus.READY) continue;
    if (match.player1?.type !== ParticipantType.BOT || match.player2?.type !== ParticipantType.BOT) continue;
    if (!match.player1.botId || !match.player2.botId) continue;

    const [bot1, bot2] = await Promise.all([
      prisma.botProfile.findUniqueOrThrow({ where: { id: match.player1.botId } }),
      prisma.botProfile.findUniqueOrThrow({ where: { id: match.player2.botId } }),
    ]);

    const context: GameContext = {
      sessionId: match.id,
      participants: [
        { participantId: match.player1.id, type: ParticipantType.BOT, botProfileId: bot1.id, displayName: match.player1.displayName },
        { participantId: match.player2.id, type: ParticipantType.BOT, botProfileId: bot2.id, displayName: match.player2.displayName },
      ],
      timers: DEFAULT_GAME_TIMERS,
    };

    const bots: Record<string, BotPlayer> = {
      [match.player1.id]: toBotPlayer(match.player1.id, bot1),
      [match.player2.id]: toBotPlayer(match.player2.id, bot2),
    };

    const gameType = await gameTypeRepository.findById(match.gameTypeId);
    const result = simulateBotVsBotMatch(resolveGameId(gameType.code), context, bots);

    await finalizeMatchResult(match.id, result, result.finalScores[match.player1.id] ?? 0, result.finalScores[match.player2.id] ?? 0);
  }
}

/**
 * A player can withdraw (棄権) from a tournament while waiting between rounds — after they've
 * already won their current match but before the round's other match(es) finish, so there's no
 * live match of theirs to forfeit yet (see withdraw.service.ts). They're marked WITHDRAWN
 * immediately, but the bracket can't route around them mid-structure without real bye-round
 * support, so instead: the moment a real match pairing them against someone actually gets
 * created (here, right after round generation — the same place bot-vs-bot matches auto-resolve),
 * that match is instantly forfeited on their behalf so their opponent isn't left waiting on a
 * no-show.
 */
export async function resolveWithdrawnMatchesForRound(tournamentId: string, round: number) {
  const matches = await tournamentMatchRepository.listForRound(tournamentId, round);

  for (const match of matches) {
    if (match.status !== MatchStatus.READY) continue;
    if (!match.player1 || !match.player2) continue;
    const withdrawnSide =
      match.player1.status === ParticipantStatus.WITHDRAWN
        ? match.player1
        : match.player2.status === ParticipantStatus.WITHDRAWN
          ? match.player2
          : null;
    if (!withdrawnSide) continue;

    await forfeitMatch(match.id, withdrawnSide.id);
  }
}

/** A player choosing to forfeit their current live match (withdraw.service.ts) reuses the normal
 * loss path — same elimination/points/bracket-advancement as losing a real round — so the rest
 * of the bracket behaves exactly as if they'd played and lost. */
export async function forfeitMatch(matchId: string, forfeitingParticipantId: string) {
  const match = await tournamentMatchRepository.findById(matchId);
  if (!match.player1 || !match.player2) return;
  if (match.status !== MatchStatus.READY && match.status !== MatchStatus.IN_PROGRESS) return;

  const winner = match.player1.id === forfeitingParticipantId ? match.player2 : match.player1;
  const loser = winner.id === match.player1.id ? match.player2 : match.player1;

  const session = await gameSessionRepository.findByMatchId(matchId);
  if (session && session.status === "ACTIVE") {
    await gameSessionRepository.abandon(session.id);
  }

  const gameType = await gameTypeRepository.findById(match.gameTypeId);
  await finalizeMatchResult(
    matchId,
    {
      gameId: resolveGameId(gameType.code),
      sessionId: matchId,
      winnerParticipantId: winner.id,
      loserParticipantId: loser.id,
      isDraw: false,
      finalScores: {},
      rounds: [],
    },
    0,
    0,
  );
}

function resolveGameId(gameTypeCode: string): string {
  return gameTypeCode.toLowerCase().replace(/_/g, "-");
}

/**
 * Persists a match's outcome (idempotently), eliminates the loser, awards points, updates
 * profile/game stats for human participants, and — if this completes the round — advances the
 * bracket. Safe to call more than once for the same match; a second call is a no-op.
 */
export async function finalizeMatchResult(
  matchId: string,
  gameResult: GameResult,
  player1Score: number,
  player2Score: number,
) {
  const outcome = await prisma.$transaction(async (tx) => {
    const existing = await tx.matchResult.findUnique({ where: { tournamentMatchId: matchId } });
    if (existing) return { alreadyFinalized: true as const };

    const match = await tx.tournamentMatch.findUniqueOrThrow({
      where: { id: matchId },
      include: { tournament: true, player1: true, player2: true },
    });

    if (!match.player1 || !match.player2 || !gameResult.winnerParticipantId || !gameResult.loserParticipantId) {
      throw new Error("Cannot finalize a match without two participants and a decisive result.");
    }

    await tx.matchResult.create({
      data: {
        tournamentMatchId: matchId,
        winnerParticipantId: gameResult.winnerParticipantId,
        loserParticipantId: gameResult.loserParticipantId,
        player1Score,
        player2Score,
        resultData: gameResult as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: { status: MatchStatus.COMPLETED, winnerParticipantId: gameResult.winnerParticipantId, completedAt: new Date() },
    });

    const winner = match.player1.id === gameResult.winnerParticipantId ? match.player1 : match.player2;
    const loser = winner.id === match.player1.id ? match.player2 : match.player1;

    await tx.tournamentParticipant.update({
      where: { id: loser.id },
      data: { status: ParticipantStatus.ELIMINATED, eliminatedRound: match.round },
    });

    const league = await tx.league.findUniqueOrThrow({ where: { id: match.tournament.leagueId } });
    const isFinal = isFinalRound(match.round, match.tournament.maxPlayers);

    if (winner.type === ParticipantType.HUMAN && winner.playerId) {
      const reason = isFinal ? PointReason.CHAMPION : ROUND_CLEAR_REASON[match.round];
      await rewardAndUpdateStats(tx, winner.playerId, reason, match.tournament.id, league, true, match.gameTypeId, isFinal, match.round);
      if (isFinal) {
        await awardChampionPrize(tx, winner.playerId, league.rewardMultiplier);
        await awardLeagueTrophy(tx, winner.playerId, league.id);
      }
      await checkAndUnlockAchievements(tx, winner.playerId, league);
      await incrementDailyMissionCounters(tx, winner.playerId, true);
    }

    if (loser.type === ParticipantType.HUMAN && loser.playerId) {
      if (isFinal) {
        await rewardAndUpdateStats(tx, loser.playerId, PointReason.RUNNER_UP, match.tournament.id, league, false, match.gameTypeId, false, match.round);
      } else {
        await updateStatsOnly(tx, loser.playerId, false, match.gameTypeId);
        // "ベスト4"(round 4 敗退)は原則ペナルティなし — ROUND_ELIMINATION_REASON に round 4 の
        // エントリが存在しないため、この分岐は round 1〜3 敗退のときだけ動く。
        const eliminationReason = ROUND_ELIMINATION_REASON[match.round];
        if (eliminationReason) {
          await applyEliminationPenalty(tx, loser.playerId, eliminationReason, match.tournament.id, league, match.round);
        }
      }
      await checkAndUnlockAchievements(tx, loser.playerId, league);
      await incrementDailyMissionCounters(tx, loser.playerId, false);
    }

    if (isFinal) {
      await tx.tournamentParticipant.update({ where: { id: winner.id }, data: { finalPlacement: 1 } });
      await tx.tournamentParticipant.update({ where: { id: loser.id }, data: { finalPlacement: 2 } });
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: TournamentStatus.COMPLETED, completedAt: new Date(), winnerParticipantId: winner.id },
      });
    }

    return { alreadyFinalized: false as const, tournamentId: match.tournamentId, round: match.round, isFinal };
  });

  if (!outcome.alreadyFinalized && !outcome.isFinal) {
    await tryAdvanceRound(outcome.tournamentId, outcome.round);
  }

  return outcome;
}

async function rewardAndUpdateStats(
  tx: Tx,
  playerProfileId: string,
  reason: PointReason,
  tournamentId: string,
  league: { id: string; rewardMultiplier: number },
  won: boolean,
  gameTypeId: string,
  isChampion: boolean,
  round: number,
) {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } });
  await awardPoints(tx, {
    playerProfileId,
    currentPoints: profile.totalPoints,
    reason,
    league,
    tournamentId,
    leagueId: league.id,
    round,
  });
  await updateStatsOnly(tx, playerProfileId, won, gameTypeId, isChampion);
}

/**
 * Deducts league points for being eliminated before "ベスト4" (round 1〜3 losses) — negative
 * BASE_POINT_REWARDS entries in config/points.ts, scaled by the same league.rewardMultiplier as
 * every positive reward so higher leagues lose more per early exit. Reuses awardPoints/
 * applyTransaction as-is, so the existing floor-at-0 clamp (domain/services/points.service.ts)
 * and automatic league re-sync (features/points/award-points.service.ts's syncCurrentLeague,
 * which already recomputes currentLeagueId purely from totalPoints in both directions) apply
 * with zero new code — a big enough streak of penalties can legitimately demote a player, the
 * same existing mechanism that promotes them.
 */
async function applyEliminationPenalty(
  tx: Tx,
  playerProfileId: string,
  reason: PointReason,
  tournamentId: string,
  league: { id: string; rewardMultiplier: number },
  round: number,
) {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } });
  await awardPoints(tx, {
    playerProfileId,
    currentPoints: profile.totalPoints,
    reason,
    league,
    tournamentId,
    leagueId: league.id,
    round,
  });
}

/** 賞金 (prizeCurrency): a spendable shop wallet, separate from the points ladder that drives league placement. */
async function awardChampionPrize(tx: Tx, playerProfileId: string, rewardMultiplier: number) {
  const amount = Math.round(BASE_CHAMPION_PRIZE * rewardMultiplier);
  await tx.playerProfile.update({
    where: { id: playerProfileId },
    data: { prizeCurrency: { increment: amount }, lifetimePrizeCurrency: { increment: amount } },
  });
}

/** Upserts the player's trophy for this league — first win creates it, every repeat win increments `count`. */
async function awardLeagueTrophy(tx: Tx, playerProfileId: string, leagueId: string) {
  await tx.leagueTrophy.upsert({
    where: { playerProfileId_leagueId: { playerProfileId, leagueId } },
    update: { count: { increment: 1 } },
    create: { playerProfileId, leagueId, count: 1 },
  });
}

async function updateStatsOnly(tx: Tx, playerProfileId: string, won: boolean, gameTypeId: string, isChampion = false) {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } });
  const newStreak = won ? profile.currentWinStreak + 1 : 0;

  await tx.playerProfile.update({
    where: { id: playerProfileId },
    data: {
      totalMatches: { increment: 1 },
      totalWins: won ? { increment: 1 } : undefined,
      totalLosses: won ? undefined : { increment: 1 },
      currentWinStreak: newStreak,
      bestWinStreak: Math.max(profile.bestWinStreak, newStreak),
      tournamentWins: isChampion ? { increment: 1 } : undefined,
    },
  });

  await playerGameStatsRepository.recordMatch(tx, playerProfileId, gameTypeId, won);
}

/**
 * Runs right after a HUMAN participant's stats update inside finalizeMatchResult's transaction —
 * every stat an achievement can depend on (totalMatches/totalWins/bestWinStreak/tournamentWins/
 * distinctGamesPlayed via the sibling updateStatsOnly call, totalPoints via the sibling
 * rewardAndUpdateStats call) is already fresh by this point. `tournamentEntries` and
 * `finalsReached` are updated elsewhere (tournament join / round advancement respectively) but
 * always *before* a match involving the new value can be finalized, so reading the profile row
 * fresh here still catches them correctly — at most one match's delay behind the instant they
 * were actually crossed, which is imperceptible.
 */
async function checkAndUnlockAchievements(tx: Tx, playerProfileId: string, league: { rewardMultiplier: number }) {
  const [profile, distinctGamesPlayed, allAchievements, unlockedCodes] = await Promise.all([
    tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } }),
    playerGameStatsRepository.countDistinctGamesPlayed(playerProfileId, tx),
    achievementRepository.findAllActive(),
    achievementRepository.unlockedCodes(playerProfileId),
  ]);

  const newlyMet = findNewlyMetAchievements(ACHIEVEMENTS, unlockedCodes, {
    totalMatches: profile.totalMatches,
    totalWins: profile.totalWins,
    bestWinStreak: profile.bestWinStreak,
    finalsReached: profile.finalsReached,
    tournamentWins: profile.tournamentWins,
    tournamentEntries: profile.tournamentEntries,
    totalPoints: profile.totalPoints,
    distinctGamesPlayed,
    loginBonusStreak: profile.loginBonusStreak,
    lifetimePrizeCurrency: profile.lifetimePrizeCurrency,
  });
  if (newlyMet.length === 0) return;

  const rowByCode = new Map(allAchievements.map((a) => [a.code, a]));
  for (const achievement of newlyMet) {
    const row = rowByCode.get(achievement.code);
    if (!row) continue;

    const isNewUnlock = await achievementRepository.unlock(tx, playerProfileId, row.id);
    if (!isNewUnlock || achievement.rewardPoints <= 0) continue;

    const current = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } });
    await awardPoints(tx, {
      playerProfileId,
      currentPoints: current.totalPoints,
      reason: PointReason.ACHIEVEMENT_BONUS,
      league,
      overrideAmount: achievement.rewardPoints,
    });
  }
}

/** Feeds today's ミッション progress (features/daily-missions/daily-missions.service.ts). Lazily
 * resets both counters to 0 the first time they're touched on a new JST calendar day — no cron
 * job needed, matching PlayerProfile.dailyMissionDate's doc comment. */
async function incrementDailyMissionCounters(tx: Tx, playerProfileId: string, won: boolean) {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerProfileId } });
  const todayKey = toJstDateKey(new Date());
  const isStale = profile.dailyMissionDate !== todayKey;

  await tx.playerProfile.update({
    where: { id: playerProfileId },
    data: {
      dailyMissionDate: todayKey,
      dailyMatchesPlayed: isStale ? 1 : { increment: 1 },
      dailyWins: won ? (isStale ? 1 : { increment: 1 }) : isStale ? 0 : undefined,
    },
  });
}

/** Once every match in a round is complete, pairs winners into the next round and auto-resolves any all-BOT matches there. */
export async function tryAdvanceRound(tournamentId: string, completedRound: number) {
  const matches = await tournamentMatchRepository.listForRound(tournamentId, completedRound);
  if (matches.length === 0 || !matches.every((m) => m.status === MatchStatus.COMPLETED)) return;

  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament || tournament.status === TournamentStatus.COMPLETED) return;

  const orderedWinners = matches
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((m) => m.winnerParticipantId)
    .filter((id): id is string => Boolean(id));

  if (orderedWinners.length < 2) return;

  const nextRound = completedRound + 1;
  const plans = pairNextRound(nextRound, orderedWinners);
  const gameTypes = await gameTypeRepository.findAllActive();

  await tournamentMatchRepository.createMany(
    plans.map((plan) => ({
      tournamentId,
      round: plan.round,
      matchNumber: plan.matchNumber,
      player1ParticipantId: plan.participant1Id,
      player2ParticipantId: plan.participant2Id,
      gameTypeId: gameTypes[Math.floor(Math.random() * gameTypes.length)].id,
    })),
  );

  await tournamentRepository.update(tournamentId, { currentRound: nextRound });

  if (isFinalRound(nextRound, tournament.maxPlayers)) {
    for (const participantId of orderedWinners) {
      const participant = await tournamentParticipantRepository.findById(participantId);
      if (participant.type === ParticipantType.HUMAN && participant.playerId) {
        await prisma.playerProfile.update({ where: { id: participant.playerId }, data: { finalsReached: { increment: 1 } } });
      }
    }
  }

  await resolveBotVsBotMatchesForRound(tournamentId, nextRound);
  await resolveWithdrawnMatchesForRound(tournamentId, nextRound);
}
