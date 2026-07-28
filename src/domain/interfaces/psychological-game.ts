import type { ParticipantType } from "@/domain/enums";

/** A stable, minimal reference to one side of a match — enough for a game plugin to work with. */
export interface ParticipantRef {
  participantId: string;
  type: ParticipantType;
  /** Present for BOT participants; used by createBotAction. Undefined for humans. */
  botProfileId?: string;
  displayName: string;
}

/** Timer budget (seconds) handed to a session; sourced from config/timers.ts + per-game overrides. */
export interface GameTimers {
  ruleExplainSeconds: number;
  choiceSeconds: number;
  resultSeconds: number;
}

/** Everything a game needs to initialize a fresh session for one match. */
export interface GameContext {
  sessionId: string;
  participants: [ParticipantRef, ParticipantRef];
  timers: GameTimers;
}

/** Base shape every per-game state must extend. Games add their own fields on top. */
export interface GameState {
  gameId: string;
  sessionId: string;
  round: number;
  totalRounds: number;
  status: "IN_PROGRESS" | "COMPLETE";
  scores: Record<string, number>;
  /** Per-round history, most recent last, used for opponent-tendency displays. */
  history: RoundRecord[];
}

export interface RoundRecord {
  round: number;
  actions: Record<string, PlayerAction>;
  outcome?: Record<string, number>;
}

/** Base shape for a submitted action. Games narrow actionData's type via their own action types. */
export interface PlayerAction<TData = unknown> {
  participantId: string;
  round: number;
  actionType: string;
  actionData: TData;
  submittedAt: number;
}

export interface GameResult {
  gameId: string;
  sessionId: string;
  winnerParticipantId: string | null;
  loserParticipantId: string | null;
  isDraw: boolean;
  finalScores: Record<string, number>;
  rounds: RoundRecord[];
}

/** Minimal bot info a game's createBotAction needs — the full BotProfile lives in domain/entities. */
export interface BotPlayer {
  participantId: string;
  botProfileId: string;
  personality: string;
  judgment: number;
  deception: number;
  observation: number;
  riskTolerance: number;
  memory: number;
  randomness: number;
}

/**
 * The plugin contract every psychological mini-game implements. The tournament engine, game
 * session API, and bot runner only ever call through this interface (via the registry) — no
 * game-specific branching lives outside a game's own module.
 */
export interface PsychologicalGame<
  TState extends GameState = GameState,
  TAction extends PlayerAction = PlayerAction,
> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  totalRounds: number;

  initialize(context: GameContext): TState;
  handleAction(state: TState, action: TAction): TState;
  calculateResult(state: TState): GameResult;
  createBotAction(state: TState, bot: BotPlayer): TAction;
  isRoundComplete(state: TState): boolean;
  /** Mutates state to play a sudden-death round when calculateResult reports a draw. */
  resolveTiebreak(state: TState): TState;
}
