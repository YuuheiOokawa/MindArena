import type { BotPlayer, GameContext, GameResult, PsychologicalGame } from "@/domain/interfaces/psychological-game";
import { extendForSuddenDeath } from "@/domain/services/tiebreak";
import { submitSimultaneousAction } from "@/features/games/core/simultaneous-round";
import { resolveBotStrategy } from "@/features/bots/strategy-registry";
import type { BotPersonality } from "@/domain/enums";
import { computeRoundScores } from "./scoring";
import type { NumberBluffAction, NumberBluffState } from "./types";

const TOTAL_ROUNDS = 3;

function buildResult(state: NumberBluffState): GameResult {
  const [idA, idB] = state.participantIds;
  const scoreA = state.scores[idA] ?? 0;
  const scoreB = state.scores[idB] ?? 0;
  const isDraw = scoreA === scoreB;

  return {
    gameId: "number-bluff",
    sessionId: state.sessionId,
    winnerParticipantId: isDraw ? null : scoreA > scoreB ? idA : idB,
    loserParticipantId: isDraw ? null : scoreA > scoreB ? idB : idA,
    isDraw,
    finalScores: { ...state.scores },
    rounds: state.history,
  };
}

export const numberBluffGame: PsychologicalGame<NumberBluffState, NumberBluffAction> = {
  id: "number-bluff",
  name: "NUMBER BLUFF",
  description: "数字と宣言の真偽を読み合う3ラウンドのブラフ勝負。",
  minPlayers: 2,
  maxPlayers: 2,
  totalRounds: TOTAL_ROUNDS,

  initialize(context: GameContext): NumberBluffState {
    const [p1, p2] = context.participants;
    return {
      gameId: "number-bluff",
      sessionId: context.sessionId,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      status: "IN_PROGRESS",
      scores: { [p1.participantId]: 0, [p2.participantId]: 0 },
      history: [],
      participantIds: [p1.participantId, p2.participantId],
      phase: "DECLARE",
      pendingDeclarations: {},
      pendingResponses: {},
    };
  },

  handleAction(state, action) {
    if (state.status !== "IN_PROGRESS") return state;
    if (action.round !== state.round) throw new Error("現在のラウンドと異なる行動です。");

    if (action.actionType === "DECLARE") {
      if (state.phase !== "DECLARE") throw new Error("宣言フェーズではありません。");
      const { pendingActions, bothSubmitted } = submitSimultaneousAction(
        state.pendingDeclarations,
        action,
        state.participantIds,
      );
      return {
        ...state,
        pendingDeclarations: pendingActions,
        phase: bothSubmitted ? "RESPOND" : "DECLARE",
      };
    }

    // RESPOND
    if (state.phase !== "RESPOND") throw new Error("応答フェーズではありません。");
    const { pendingActions, bothSubmitted } = submitSimultaneousAction(
      state.pendingResponses,
      action,
      state.participantIds,
    );

    if (!bothSubmitted) {
      return { ...state, pendingResponses: pendingActions };
    }

    const [idA, idB] = state.participantIds;
    const declareA = state.pendingDeclarations[idA];
    const declareB = state.pendingDeclarations[idB];
    const respondA = pendingActions[idA];
    const respondB = pendingActions[idB];

    const { scoreA, scoreB } = computeRoundScores({
      numberA: declareA.actionData.number,
      declarationIdA: declareA.actionData.declarationId,
      believeA_aboutB: respondA.actionData.believe,
      numberB: declareB.actionData.number,
      declarationIdB: declareB.actionData.declarationId,
      believeB_aboutA: respondB.actionData.believe,
    });

    const nextRound = state.round + 1;
    const isFinalRound = nextRound > state.totalRounds;

    return {
      ...state,
      round: nextRound,
      status: isFinalRound ? "COMPLETE" : "IN_PROGRESS",
      phase: "DECLARE",
      scores: { [idA]: state.scores[idA] + scoreA, [idB]: state.scores[idB] + scoreB },
      history: [
        ...state.history,
        {
          round: state.round,
          actions: { [idA]: declareA, [idB]: declareB },
          outcome: { [idA]: scoreA, [idB]: scoreB },
        },
      ],
      pendingDeclarations: {},
      pendingResponses: {},
    };
  },

  calculateResult(state) {
    return buildResult(state);
  },

  createBotAction(state, bot: BotPlayer) {
    const strategy = resolveBotStrategy("number-bluff", bot.personality as BotPersonality);
    return strategy(state, bot, Math.random) as NumberBluffAction;
  },

  isRoundComplete(state) {
    return (
      state.participantIds.every((id) => Boolean(state.pendingDeclarations[id])) &&
      state.participantIds.every((id) => Boolean(state.pendingResponses[id]))
    );
  },

  resolveTiebreak(state) {
    const result = buildResult(state);
    return result.isDraw ? extendForSuddenDeath(state) : state;
  },
};
