import { prisma } from "@/infrastructure/database/prisma";
import { tournamentMatchRepository } from "@/infrastructure/repositories/tournament-match.repository";
import { gameSessionRepository } from "@/infrastructure/repositories/game-session.repository";
import { gameActionRepository } from "@/infrastructure/repositories/game-action.repository";
import { getGame } from "@/features/games/core/registry";
import { redactStateForParticipant } from "@/features/games/core/redaction";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { coinFlip } from "@/domain/services/tiebreak";
import { isFinalRound } from "@/domain/services/bracket.service";
import { DEFAULT_GAME_TIMERS } from "@/config/timers";
import { ROUND_CLEAR_REASON } from "@/config/round-rewards";
import { MatchStatus, PointReason, type ParticipantType } from "@/domain/enums";
import { AppError } from "@/lib/errors/app-error";
import { isE2eTestMode } from "@/lib/e2e-test-mode";
import { getE2eTestBotAction } from "@/features/games/core/e2e-test-mode-actions";
import type { BotPlayer, GameContext, GameState, PlayerAction, PsychologicalGame } from "@/domain/interfaces/psychological-game";
import type { Prisma } from "@/generated/prisma/client";

function resolveBotAction(
  game: PsychologicalGame<GameState, PlayerAction>,
  gameId: string,
  state: GameState,
  bot: BotPlayer,
): PlayerAction {
  if (isE2eTestMode()) {
    return getE2eTestBotAction(gameId, bot.participantId, state.round, (state as { phase?: string }).phase);
  }
  return game.createBotAction(state, bot);
}

function resolveGameId(gameTypeCode: string): string {
  return gameTypeCode.toLowerCase().replace(/_/g, "-");
}

async function buildContext(matchId: string, opts: { requireActive?: boolean } = {}) {
  const { requireActive = true } = opts;
  const match = await tournamentMatchRepository.findById(matchId);
  if (!match.player1 || !match.player2) {
    throw new AppError("MATCH_NOT_READY", "対戦相手がまだ決まっていません。");
  }
  if (requireActive && (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.CANCELLED)) {
    throw new AppError("MATCH_NOT_READY", "この対戦はすでに終了しています。");
  }

  const context: GameContext = {
    sessionId: matchId,
    participants: [
      { participantId: match.player1.id, type: match.player1.type as ParticipantType, displayName: match.player1.displayName },
      { participantId: match.player2.id, type: match.player2.type as ParticipantType, displayName: match.player2.displayName },
    ],
    timers: DEFAULT_GAME_TIMERS,
  };

  return { match, context, gameId: resolveGameId(match.gameType.code) };
}

async function loadBotPlayer(participant: { id: string; botId: string | null }): Promise<BotPlayer | null> {
  if (!participant.botId) return null;
  const bot = await prisma.botProfile.findUniqueOrThrow({ where: { id: participant.botId } });
  return {
    participantId: participant.id,
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

function assertParticipant(matchId: string, match: { player1ParticipantId: string | null; player2ParticipantId: string | null }, participantId: string) {
  if (match.player1ParticipantId !== participantId && match.player2ParticipantId !== participantId) {
    throw new AppError("FORBIDDEN", "この対戦の参加者ではありません。");
  }
}

/** Gets or creates the GameSession for a match, and marks it IN_PROGRESS. */
export async function startOrResumeSession(matchId: string, requestingParticipantId: string) {
  const { match, context, gameId } = await buildContext(matchId);
  assertParticipant(matchId, match, requestingParticipantId);

  const existing = await gameSessionRepository.findByMatchId(matchId);
  if (existing) {
    return redactStateForParticipant(existing.state as Record<string, unknown>, requestingParticipantId);
  }

  const game = getGame(gameId);
  const state = game.initialize(context);

  await gameSessionRepository.create({
    tournamentMatchId: matchId,
    gameTypeId: match.gameTypeId,
    state: state as unknown as Prisma.InputJsonValue,
  });

  if (match.status === MatchStatus.READY) {
    await tournamentMatchRepository.update(matchId, { status: MatchStatus.IN_PROGRESS, startedAt: new Date() });
  }

  return redactStateForParticipant(state as unknown as Record<string, unknown>, requestingParticipantId);
}

export async function getSessionStateForParticipant(matchId: string, requestingParticipantId: string) {
  // requireActive: false — this is a read path. In a human-vs-human match, only the player whose
  // submission resolves the final round sees the outcome via their own POST response; the other
  // player only learns it through this poll, which fires after the match is already COMPLETED.
  const { match } = await buildContext(matchId, { requireActive: false });
  assertParticipant(matchId, match, requestingParticipantId);

  const session = await gameSessionRepository.findByMatchId(matchId);
  if (!session) throw new AppError("SESSION_NOT_FOUND");

  return redactStateForParticipant(session.state as Record<string, unknown>, requestingParticipantId);
}

/**
 * Applies a human's action, then — if the opponent is a BOT — immediately generates and
 * applies the BOT's matching action so the round doesn't stall waiting on a client that will
 * never poll. Finalizes the match (and advances the bracket) the moment the result is decisive.
 */
export async function submitPlayerAction(
  matchId: string,
  participantId: string,
  action: { round: number; actionType: string; actionData: unknown },
) {
  const { match, gameId } = await buildContext(matchId);
  assertParticipant(matchId, match, participantId);

  const session = await gameSessionRepository.findByMatchId(matchId);
  if (!session) throw new AppError("SESSION_NOT_FOUND");

  const game = getGame(gameId);
  let state = session.state as unknown as GameState;

  if (state.status !== "IN_PROGRESS") {
    throw new AppError("CONFLICT", "この対戦はすでに終了しています。");
  }

  const playerAction: PlayerAction = { participantId, ...action, submittedAt: Date.now() };

  try {
    state = game.handleAction(state, playerAction);
  } catch {
    throw new AppError("DUPLICATE_ACTION");
  }

  await gameActionRepository.record({
    gameSessionId: session.id,
    participantId,
    round: action.round,
    actionType: action.actionType,
    actionData: action.actionData as Prisma.InputJsonValue,
  });

  const opponentParticipant = match.player1ParticipantId === participantId ? match.player2 : match.player1;
  const opponentBot = opponentParticipant ? await loadBotPlayer(opponentParticipant) : null;

  if (opponentBot && state.status === "IN_PROGRESS") {
    try {
      const botAction = resolveBotAction(game, gameId, state, opponentBot);
      state = game.handleAction(state, botAction);
    } catch {
      // Bot already acted for this phase — nothing to do.
    }
  }

  // Draw handling: extend once for sudden death, then fall back to a coin flip.
  let result = game.calculateResult(state);
  if (result.isDraw && state.status === "COMPLETE") {
    const extended = game.resolveTiebreak(state);
    if (extended !== state) {
      state = extended;
      if (opponentBot) {
        try {
          const botAction = resolveBotAction(game, gameId, state, opponentBot);
          state = game.handleAction(state, botAction);
        } catch {
          // waiting on the human for the sudden-death round
        }
      }
      result = game.calculateResult(state);
    } else {
      const [idA, idB] = match.player1ParticipantId === participantId
        ? [match.player1ParticipantId, match.player2ParticipantId]
        : [match.player2ParticipantId, match.player1ParticipantId];
      const winner = coinFlip(Math.random, [idA!, idB!]);
      result = { ...result, isDraw: false, winnerParticipantId: winner, loserParticipantId: winner === idA ? idB! : idA! };
    }
  }

  if (state.status === "COMPLETE" && !result.isDraw) {
    await gameSessionRepository.complete(session.id, state as unknown as Prisma.InputJsonValue);
    const p1Score = result.finalScores[match.player1ParticipantId!] ?? 0;
    const p2Score = result.finalScores[match.player2ParticipantId!] ?? 0;
    await finalizeMatchResult(matchId, result, p1Score, p2Score);
  } else {
    await gameSessionRepository.updateState(session.id, state as unknown as Prisma.InputJsonValue, state.round);
  }

  return redactStateForParticipant(state as unknown as Record<string, unknown>, participantId);
}

export async function getMatchResultForParticipant(matchId: string, participantId: string) {
  const match = await tournamentMatchRepository.findById(matchId);
  assertParticipant(matchId, match, participantId);

  const result = await prisma.matchResult.findUnique({ where: { tournamentMatchId: matchId } });
  if (!result) throw new AppError("NOT_FOUND", "対戦結果がまだありません。");

  const won = result.winnerParticipantId === participantId;
  const opponent = match.player1ParticipantId === participantId ? match.player2 : match.player1;
  const myScore = match.player1ParticipantId === participantId ? result.player1Score : result.player2Score;
  const opponentScore = match.player1ParticipantId === participantId ? result.player2Score : result.player1Score;
  const resultData = result.resultData as unknown as { rounds?: unknown[] } | null;

  const me = match.player1ParticipantId === participantId ? match.player1 : match.player2;
  const pointsEarned =
    won && me?.playerId
      ? await findAwardedPointsForRound(me.playerId, match.tournamentId, match.round, match.tournament.maxPlayers)
      : 0;

  return {
    matchId,
    won,
    myScore,
    opponentScore,
    opponentName: opponent?.displayName ?? "相手",
    rounds: resultData?.rounds ?? [],
    round: match.round,
    tournamentId: match.tournamentId,
    pointsEarned,
  };
}

async function findAwardedPointsForRound(playerProfileId: string, tournamentId: string, round: number, maxPlayers: number) {
  const isFinal = isFinalRound(round, maxPlayers);
  const reason = isFinal ? PointReason.CHAMPION : ROUND_CLEAR_REASON[round];
  if (!reason) return 0;

  const transaction = await prisma.pointTransaction.findFirst({
    where: { playerProfileId, tournamentId, reason },
    orderBy: { createdAt: "desc" },
  });
  return transaction?.amount ?? 0;
}
