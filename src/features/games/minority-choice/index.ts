import type { BotPlayer, GameContext, GameResult, PsychologicalGame } from "@/domain/interfaces/psychological-game";
import { extendForSuddenDeath } from "@/domain/services/tiebreak";
import { submitSimultaneousAction } from "@/features/games/core/simultaneous-round";
import { resolveBotStrategy } from "@/features/bots/strategy-registry";
import type { BotPersonality } from "@/domain/enums";
import { computeMinorityScore, simulateCrowd } from "./scoring";
import type { MinorityChoiceAction, MinorityChoiceState } from "./types";

const TOTAL_ROUNDS = 3;

function buildResult(state: MinorityChoiceState): GameResult {
  const [idA, idB] = state.participantIds;
  const scoreA = state.scores[idA] ?? 0;
  const scoreB = state.scores[idB] ?? 0;
  const isDraw = scoreA === scoreB;

  return {
    gameId: "minority-choice",
    sessionId: state.sessionId,
    winnerParticipantId: isDraw ? null : scoreA > scoreB ? idA : idB,
    loserParticipantId: isDraw ? null : scoreA > scoreB ? idB : idA,
    isDraw,
    finalScores: { ...state.scores },
    rounds: state.history,
  };
}

export const minorityChoiceGame: PsychologicalGame<MinorityChoiceState, MinorityChoiceAction> = {
  id: "minority-choice",
  name: "MINORITY CHOICE",
  description: "群衆の傾向を読み、少数派を選び続ける3ラウンドの心理戦。",
  minPlayers: 2,
  maxPlayers: 2,
  totalRounds: TOTAL_ROUNDS,

  initialize(context: GameContext): MinorityChoiceState {
    const [p1, p2] = context.participants;
    return {
      gameId: "minority-choice",
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
      crowdByRound: {},
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
    const crowd = simulateCrowd(state.sessionId, state.round);
    const { scoreA, scoreB } = computeMinorityScore(
      pendingActions[idA].actionData.choice,
      pendingActions[idB].actionData.choice,
      crowd,
    );

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
      crowdByRound: { ...state.crowdByRound, [state.round]: crowd },
      declarations: {},
      pendingActions: {},
    };
  },

  calculateResult(state) {
    return buildResult(state);
  },

  createBotAction(state, bot: BotPlayer) {
    const strategy = resolveBotStrategy("minority-choice", bot.personality as BotPersonality);
    return strategy(state, bot, Math.random) as MinorityChoiceAction;
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
