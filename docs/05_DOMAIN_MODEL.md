# 05. Domain Model

## Core enums (`domain/enums`)

```ts
enum TournamentStatus { RECRUITING, READY, IN_PROGRESS, COMPLETED, CANCELLED }
enum MatchStatus { WAITING, READY, IN_PROGRESS, COMPLETED, CANCELLED }
enum ParticipantType { HUMAN, BOT }
enum ParticipantStatus { ACTIVE, ELIMINATED, BYE, WITHDRAWN }
enum GameSessionStatus { ACTIVE, COMPLETED, ABANDONED }
enum BotDifficulty { EASY, NORMAL, HARD, EXPERT, MASTER }
enum BotPersonality { RANDOM, CAUTIOUS, AGGRESSIVE, BETRAYER, PATTERN, ANALYST }
enum PointReason {
  TOURNAMENT_ENTRY, ROUND_1_CLEAR, ROUND_2_CLEAR, QUARTERFINAL_CLEAR,
  SEMIFINAL_CLEAR, RUNNER_UP, CHAMPION, ACHIEVEMENT_BONUS, ADMIN_ADJUSTMENT
}
enum TimeoutPolicy { RANDOM_ACTION, FORFEIT_ROUND }
```

## The plugin interface (`domain/interfaces/psychological-game.ts`)

```ts
interface PsychologicalGame<TState extends GameState = GameState, TAction extends PlayerAction = PlayerAction> {
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
  resolveTiebreak(state: TState): TState; // sudden-death round mutation, game-specific
}
```

`GameContext` carries `{ sessionId, participants: [ParticipantRef, ParticipantRef], timers }`.
`GameState` is a discriminated-by-`gameId` union so each game can carry its own shape
(`TrustOrBetrayState`, `NumberBluffState`, ...) while the engine code stays generic over the
common base fields (`gameId`, `round`, `totalRounds`, `scores`, `history`, `status`).

## Entities (`domain/entities`)

Plain TypeScript types mirroring the Prisma models (kept separate from `@prisma/client`'s
generated types so domain/services never import Prisma): `UserEntity`, `PlayerProfileEntity`,
`LeagueEntity`, `TournamentEntity`, `TournamentParticipantEntity`, `TournamentMatchEntity`,
`GameSessionEntity`, `MatchResultEntity`, `PointTransactionEntity`, `BotProfileEntity`,
`AchievementEntity`, `CosmeticItemEntity`.

## Key domain services (pure functions / classes, no I/O)

- `points.service.ts` — `calculateReward(baseReason, league): number`,
  `applyTransaction(profile, delta, reason): { balanceBefore, balanceAfter }`.
- `league-progress.service.ts` — `getUnlockedLeagues(points, leagues)`,
  `getNextLeague(points, leagues)`, `progressToNext(points, leagues)`.
- `profile-decoration.service.ts` — `resolveFrameTier(points, frameTiers)`,
  `resolveTitle(selectedTitleId, unlockedTitles)`.
- `bracket.service.ts` — `generateBracket(participants)`, `advanceWinner(bracket, matchId, winnerId)`,
  `isTournamentComplete(bracket)`.
- `win-rate.util.ts` — `calculateWinRate(wins, totalMatches)` → 0 when `totalMatches === 0`.
- `tiebreak.ts` — default `suddenDeathThenCoinFlip` strategy, injected per game.

Each of these is unit-tested directly (`tests/unit`) with no DB or network involved.
