# 09. Tournament Design

## State machine

```
RECRUITING ──(32 participants reached)──► READY ──(bracket generated)──► IN_PROGRESS
IN_PROGRESS ──(final match resolved)──► COMPLETED
RECRUITING ──(abandoned / dev tool)──► CANCELLED
```

`TournamentMatch.status`: `WAITING → READY (both participants known) → IN_PROGRESS → COMPLETED`
(or `CANCELLED` for a walkover).

## Join & bot fill

1. `POST /api/tournaments/join` finds an open `RECRUITING` tournament for the league, or
   creates one.
2. The joining user's `TournamentParticipant` (`type=HUMAN`) is inserted; server rejects a
   second concurrent entry by the same user in the same tournament (unique constraint on
   `(tournamentId, playerId)`).
3. Because full realtime multi-human matchmaking is out of MVP scope, the join flow
   immediately fills the remaining seats (up to 31) with `BotProfile` rows selected by the
   league's configured `botDifficulty`, weighted toward variety of personalities. This models
   "insufficient real participants get filled by BOTs" per spec while keeping the fill logic
   isolated in `features/matchmaking/bot-fill.service.ts` so a future real-matchmaking queue
   can replace *only* that service.
4. At 32/32 the tournament flips to `READY`, `bracket.service.generateBracket()` shuffles
   participants and produces 16 first-round `TournamentMatch` rows, then flips to
   `IN_PROGRESS`.

## Bracket generation

`generateBracket(participants: ParticipantRef[])`:
- Fisher–Yates shuffle (seeded by tournament id, so it's reproducible/testable).
- Pairs `[0,1], [2,3], ... [30,31]` into round-1 matches, `matchNumber` 1–16.
- Odd participant count is not possible (always exactly 32), so no byes occur at round 1 by
  construction; the bye machinery (`ParticipantStatus.BYE`) exists in the schema for future
  non-32 bracket sizes.

## Round advancement

`advanceWinner(tournamentId, matchId, winnerParticipantId)`:
- Writes `TournamentMatch.winnerParticipantId`, status `COMPLETED`.
- Marks the loser `ParticipantStatus.ELIMINATED` with `eliminatedRound`.
- If this was the last unresolved match of the current round, creates next round's matches by
  pairing winners in bracket order; if it was the Final, marks the tournament `COMPLETED`,
  writes `winnerPlayerId`, and triggers the championship reward flow.
- All of the above happens inside one Prisma `$transaction`.

## Non-human matches

Where both participants are BOTs (common in early rounds when few humans joined), the match is
resolved immediately during bracket/round generation by simulating the full game via
`GAME_REGISTRY[...].createBotAction` for both sides — no client is waiting on it. Human vs BOT
and (future) human vs human matches wait for the `GameSession` to complete through the normal
Game screen flow.

## Edge cases handled

- **Timeout** — `TimeoutPolicy` per game (`RANDOM_ACTION` default) auto-submits a synthetic
  action so a slow/absent human doesn't block the bracket forever.
- **Draw** — `resolveTiebreak` (`08_GAME_ENGINE_DESIGN.md`).
- **Disconnect / reload** — `features/tournaments/resume.ts`, described in `03_SCREEN_FLOW.md`.
- **Double entry** — unique constraint + explicit pre-check, returns `ALREADY_JOINED` error code.
- **Walkover** — schema supports a match with only one live participant resolving to an
  automatic win (`MatchStatus.COMPLETED` with no `GameSession`), used if a human withdraws
  (`ParticipantStatus.WITHDRAWN`) — implemented as the same "single active participant" check
  the round-advancement code already needs.
