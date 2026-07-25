import type {
  BotPlayer,
  GameContext,
  GameResult,
  PsychologicalGame,
} from "@/domain/interfaces/psychological-game";
import { extendForSuddenDeath } from "@/domain/services/tiebreak";
import { submitSimultaneousAction } from "@/features/games/core/simultaneous-round";
import { resolveBotStrategy } from "@/features/bots/strategy-registry";
import type { BotPersonality } from "@/domain/enums";
import { scoreRound } from "./scoring";
import type { TrustOrBetrayAction, TrustOrBetrayState } from "./types";

const TOTAL_ROUNDS = 3;

function buildResult(state: TrustOrBetrayState): GameResult {
  const [idA, idB] = state.participantIds;
  const scoreA = state.scores[idA] ?? 0;
  const scoreB = state.scores[idB] ?? 0;
  const isDraw = scoreA === scoreB;

  return {
    gameId: "trust-or-betray",
    sessionId: state.sessionId,
    winnerParticipantId: isDraw ? null : scoreA > scoreB ? idA : idB,
    loserParticipantId: isDraw ? null : scoreA > scoreB ? idB : idA,
    isDraw,
    finalScores: { ...state.scores },
    rounds: state.history,
  };
}

export const trustOrBetrayGame: PsychologicalGame<TrustOrBetrayState, TrustOrBetrayAction> = {
  id: "trust-or-betray",
  name: "TRUST OR BETRAY",
  description: "信頼か裏切りかを同時に選び、3ラウンドの合計点で競う心理戦。",
  minPlayers: 2,
  maxPlayers: 2,
  totalRounds: TOTAL_ROUNDS,

  initialize(context: GameContext): TrustOrBetrayState {
    const [p1, p2] = context.participants;
    return {
      gameId: "trust-or-betray",
      sessionId: context.sessionId,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      status: "IN_PROGRESS",
      scores: { [p1.participantId]: 0, [p2.participantId]: 0 },
      history: [],
      participantIds: [p1.participantId, p2.participantId],
      phase: "DECLARE",
      declarations: {},
      pendingActions: {},
    };
  },

  handleAction(state, action) {
    if (state.status !== "IN_PROGRESS") return state;
    if (action.round !== state.round) throw new Error("現在のラウンドと異なる行動です。");

    if (action.actionType === "DECLARE") {
      if (state.phase !== "DECLARE") throw new Error("宣言フェーズではありません。");
      const { pendingActions, bothSubmitted } = submitSimultaneousAction(
        state.declarations,
        action,
        state.participantIds,
      );
      return {
        ...state,
        declarations: pendingActions,
        phase: bothSubmitted ? "CHOOSE" : "DECLARE",
      };
    }

    // CHOOSE — the final, locked-in pick. May or may not match the round's declaration.
    if (state.phase !== "CHOOSE") throw new Error("選択フェーズではありません。");
    const { pendingActions, bothSubmitted } = submitSimultaneousAction(
      state.pendingActions,
      action,
      state.participantIds,
    );

    if (!bothSubmitted) {
      return { ...state, pendingActions };
    }

    const [idA, idB] = state.participantIds;
    const choiceA = pendingActions[idA].actionData.choice;
    const choiceB = pendingActions[idB].actionData.choice;
    const { scoreA, scoreB } = scoreRound(choiceA, choiceB);

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
        { round: state.round, actions: pendingActions, declarations: state.declarations, outcome: { [idA]: scoreA, [idB]: scoreB } },
      ],
      declarations: {},
      pendingActions: {},
    };
  },

  calculateResult(state) {
    return buildResult(state);
  },

  createBotAction(state, bot: BotPlayer) {
    const strategy = resolveBotStrategy("trust-or-betray", bot.personality as BotPersonality);
    return strategy(state, bot, Math.random) as TrustOrBetrayAction;
  },

  isRoundComplete(state) {
    return (
      state.participantIds.every((id) => Boolean(state.declarations[id])) &&
      state.participantIds.every((id) => Boolean(state.pendingActions[id]))
    );
  },

  resolveTiebreak(state) {
    const result = buildResult(state);
    return result.isDraw ? extendForSuddenDeath(state) : state;
  },
};
