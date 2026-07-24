import { getGame } from "@/features/games/core/registry";
import { coinFlip } from "@/domain/services/tiebreak";
import type {
  BotPlayer,
  GameContext,
  GameResult,
  GameState,
  PlayerAction,
  PsychologicalGame,
} from "@/domain/interfaces/psychological-game";

const MAX_ROUND_ITERATIONS = 200;
const MAX_TIEBREAK_ATTEMPTS = 5;

/**
 * Drives a full game session to completion using only BOT decisions on both sides — used
 * when a tournament match has no human participant (common in early rounds). Both games in the
 * registry expose the same generic shape (createBotAction inspects current state/phase), so
 * this driver never branches on a specific game id.
 */
export function simulateBotVsBotMatch(
  gameId: string,
  context: GameContext,
  bots: Record<string, BotPlayer>,
): GameResult {
  const game = getGame(gameId);
  const participantIds = context.participants.map((p) => p.participantId);

  let state = game.initialize(context);
  state = playRounds(game, state, bots, participantIds);

  let attempts = 0;
  let result = game.calculateResult(state);
  while (result.isDraw && attempts < MAX_TIEBREAK_ATTEMPTS) {
    attempts++;
    const extended = game.resolveTiebreak(state);
    if (extended === state) break; // tiebreak already applied once and still drawn
    state = playRounds(game, extended, bots, participantIds);
    result = game.calculateResult(state);
  }

  if (result.isDraw) {
    const [idA, idB] = participantIds;
    const winner = coinFlip(Math.random, [idA, idB]);
    const loser = winner === idA ? idB : idA;
    return { ...result, isDraw: false, winnerParticipantId: winner, loserParticipantId: loser };
  }

  return result;
}

function playRounds(
  game: PsychologicalGame<GameState, PlayerAction>,
  initialState: GameState,
  bots: Record<string, BotPlayer>,
  participantIds: string[],
): GameState {
  let state = initialState;
  let iterations = 0;

  while (state.status !== "COMPLETE" && iterations < MAX_ROUND_ITERATIONS) {
    iterations++;
    for (const participantId of participantIds) {
      if (state.status !== "IN_PROGRESS") break;
      const bot = bots[participantId];
      const action = game.createBotAction(state, bot);
      try {
        state = game.handleAction(state, action);
      } catch {
        // Already submitted for this phase/round — the other participant hasn't caught up yet.
      }
    }
  }

  return state;
}
