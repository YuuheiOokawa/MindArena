# 08. Game Engine Design

## Shared engine responsibilities (`features/games/core`)

- `registry.ts` — id → `PsychologicalGame` implementation lookup (the only "switch point").
- `session-runtime.ts` — generic round loop: applies `handleAction` for whichever participant
  acted, checks `isRoundComplete`, advances `round`, and when `round > totalRounds` calls
  `calculateResult`. This file contains **zero** game-specific logic; it only calls interface
  methods.
- `session-codec.ts` — Zod-parses the `Json` `GameSession.state`/`GameAction.actionData`
  columns into typed state per `gameTypeId` before handing to the runtime.
- `timers.ts` — reads `config/timers.ts` (rule-explain / choose / reveal durations) and the
  per-game `TimeoutPolicy`; used by both the server (to decide when an unanswered round should
  auto-resolve) and the client (to render the countdown).
- `use-game-session.ts` — the one client hook screens use; depends on `MatchChannel`
  (interface), not a specific transport.

## The 4 games (each in `features/games/<slug>/index.ts`)

### Trust or Betray
- Simultaneous choice: `TRUST | BETRAY`, 3 rounds, sum score wins.
- Scoring: `TRUST/TRUST` → +1/+1, `TRUST/BETRAY` → 0/+2, `BETRAY/BETRAY` → −1/−1.
- Bot: personality-weighted probability of betrayal that shifts round-to-round based on the
  opponent's own history (`features/bots/strategies/trust-or-betray.strategy.ts`).

### Number Bluff
- Pick 1–9, choose one of 4 fixed declaration templates (config-driven strings, not
  hardcoded in the component — `config/games/number-bluff.ts`), opponent believes/doubts.
  Payoff matrix rewards correctly calling a bluff and punishes wrongly doubting the truth.

### Minority Choice
- Choose `A|B`; a simulated BOT crowd (`crowdSize` from config) also votes, weighted by
  round-seeded randomness; whoever picked the minority side (among crowd + both real players)
  scores. 3 rounds summed.

### Final Prediction
- Rock-paper-scissors-shaped but reskinned: `STRIKE beats READ`, `READ beats GUARD`,
  `GUARD beats STRIKE`. 5 rounds. Full choice history of both sides is shown between rounds so
  the "psychological" angle (predicting a pattern) is visible, not just a blind RPS.

Every game's `resolveTiebreak` implements the shared "extra round, then coin flip" default from
`domain/services/tiebreak.ts`, called only if `calculateResult` reports a tie.

## Adding game #5

1. `features/games/<new-game>/index.ts` implements `PsychologicalGame`.
2. `features/games/<new-game>/config.schema.ts` (Zod) + `config/games/<new-game>.ts` (tunables).
3. `components/game/<new-game>/*Board.tsx` for the round UI.
4. One line in `features/games/core/registry.ts`.
5. One `GameType` seed row.
6. `features/bots/strategies/<new-game>.strategy.ts` registered in
   `features/bots/strategy-registry.ts`.

No change to tournament, matchmaking, points, or profile code is required.
