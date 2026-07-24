# 04. Architecture

## Layering rule

```
components/*  (dumb-ish UI, receives data + callbacks)
     │  reads/writes via
     ▼
features/*    (feature hooks, client-side orchestration, calls API layer)
     │  calls
     ▼
app/api/*  or  app/**/actions.ts   (route handlers / server actions — thin, do auth + validation)
     │  calls
     ▼
domain/services/*   (pure business rules: points, league unlock, bracket, game rules)
     │  reads/writes via
     ▼
infrastructure/repositories/*   (Prisma queries, the ONLY place `prisma.*` is called)
     │
     ▼
infrastructure/database (Prisma client singleton)
```

**Rule of thumb:** a React component never imports `@prisma/client` or writes point/league/
game-outcome logic inline. A route handler never writes a raw SQL/Prisma call directly — it
calls a repository. A domain service never imports Next.js request/response types, so it's
testable with plain Vitest and reusable if the transport layer changes.

## Directory layout (implemented)

```
src/
  app/                          # routes only — pages compose feature hooks + components
    (auth)/login, register, forgot-password
    (main)/home, leagues, history, profile, settings           # bottom-nav layout group
    tournaments/[id]/...                                        # focus layout group
    api/...                                                     # route handlers
  components/
    ui/            # shadcn-style primitives (button, card, progress, badge, dialog, input...)
    common/        # generic building blocks (StatTile, EmptyState, ErrorState, Loading)
    layout/        # MobileShell, BottomNav, FocusHeader, SafeArea
    game/          # per-game board components + shared GameTimer/ChoiceButton
    tournament/    # BracketRound, MatchCard, ParticipantBadge
    profile/       # ProfileFrame, TitleBadge, AchievementGrid
  features/
    auth/                       # register/login forms + hooks, calls infra/auth
    profiles/                   # profile read/decoration hooks
    leagues/                    # league list/detail hooks + unlock service wiring
    tournaments/                # join/matchmaking/bracket/resume hooks
    matchmaking/                # MatchChannel abstraction + polling implementation
    games/
      core/                     # GameEngine registry, shared types, timer/tiebreak helpers
      trust-or-betray/
      number-bluff/
      minority-choice/
      final-prediction/
    bots/                       # personalities, stat generation, per-game strategy resolution
    points/                     # point award orchestration (calls domain service + repo)
    achievements/               # unlock checks
    cosmetics/                  # frame/title tier resolution
  domain/
    enums/                      # TournamentStatus, MatchStatus, ParticipantType, etc.
    interfaces/                 # PsychologicalGame, GameContext, BotPlayer, MatchChannel...
    entities/                   # plain TS types mirrored from Prisma models (decoupled)
    services/                   # points.service, league-progress.service, bracket.service,
                                 # profile-decoration.service, win-rate.util
  infrastructure/
    database/                   # Prisma client singleton
    auth/                       # Auth.js config, password hashing
    realtime/                   # MatchChannel implementations (long-poll now, ws-ready)
    repositories/               # one file per aggregate, only Prisma access point
  lib/
    validation/                 # zod schemas
    errors/                     # AppError + error-code catalogue
    logging/                    # logger service (no raw console.log in app code)
    utils/
  config/                       # leagues.ts, games.ts, points.ts, frames.ts, titles.ts,
                                 # achievements.ts, app.ts, timers.ts — ALL master data
  types/                        # shared cross-cutting types (ApiResponse<T>, etc.)
  stores/                       # zustand stores (client UI/session state only)
  tests/
    unit/
    integration/
prisma/
  schema.prisma
  seed.ts
e2e/
```

## The plugin model (why adding a game touches nothing else)

`domain/interfaces/psychological-game.ts` defines `PsychologicalGame`. Every game
(`features/games/trust-or-betray/index.ts`, etc.) exports one object implementing it and
registers itself in `features/games/core/registry.ts`:

```ts
export const GAME_REGISTRY: Record<string, PsychologicalGame> = {
  [trustOrBetrayGame.id]: trustOrBetrayGame,
  [numberBluffGame.id]: numberBluffGame,
  [minorityChoiceGame.id]: minorityChoiceGame,
  [finalPredictionGame.id]: finalPredictionGame,
};
```

The tournament engine, game-session API routes, and BOT action generator only ever call
`GAME_REGISTRY[gameTypeId]`. None of them contain a `switch` on game id or import a specific
game module. Adding game #5 means: implement the interface, add one line to the registry, add
one `GameType` seed row — no other file changes.

The same pattern applies to leagues (`config/leagues.ts` is data, `domain/services/
league-progress.service.ts` operates generically over any league list) and BOT personalities
(`features/bots/strategies/*` register by personality key).

## Realtime abstraction

`domain/interfaces/match-channel.ts` defines `MatchChannel` (`sendAction`, `pollOpponentState`,
`subscribe`). `infrastructure/realtime/long-poll-channel.ts` implements it today by polling the
game-session API every ~1.5s. A future `infrastructure/realtime/socket-channel.ts` or
`supabase-channel.ts` can implement the same interface; `features/games/core/use-game-session.ts`
(the hook screens use) depends only on the interface, so swapping the implementation is a
one-line change in a factory function (`infrastructure/realtime/create-match-channel.ts`).

## API response contract

Every route handler / server action returns `ApiResponse<T>` (`types/api.ts`):

```ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

`lib/errors/app-error.ts` defines `AppError` with a stable `code`; a shared
`lib/errors/to-api-response.ts` converts any thrown error (including unexpected ones) into this
shape, logging the raw error server-side via `lib/logging/logger.ts` and returning a safe,
user-facing message to the client.
