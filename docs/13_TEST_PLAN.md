# 13. Test Plan

## Unit (Vitest, `tests/unit`, no DB/network)

- Each game's `calculateResult` payoff matrix (all outcome combinations) — 4 files.
- Each game's score accumulation across rounds.
- `features/bots` action generation: valid-action guarantee + optimal-rate scales with
  difficulty.
- `points.service.calculateReward` incl. league multiplier.
- `league-progress.service` unlock boundary conditions.
- `profile-decoration.service.resolveFrameTier` boundary conditions.
- `bracket.service.generateBracket` — 32 in → 16 matches, every participant appears exactly
  once, deterministic given a seed.
- `bracket.service.advanceWinner` — winner correctly seeded into next round's correct slot.
- `win-rate.util.calculateWinRate` — 0 matches → 0%, normal division, rounding.

## Integration (Vitest + a test Postgres schema via Prisma, `tests/integration`)

- Register → creates `User` + `PlayerProfile` row, password not stored in plaintext.
- Login with username, login with email, wrong password rejected.
- Join tournament → bot fill → exactly 32 participants, 1 human.
- Start tournament → bracket has 16 round-1 matches.
- Submit a full game session (both sides via bot strategies) → `MatchResult` created exactly
  once, `PointTransaction` written with correct before/after balance.
- Profile totals (`totalMatches`, `totalWins`, streaks) update after a match result.

## E2E (Playwright, `e2e/`)

`e2e/tournament-run.spec.ts` happy path:

1. Log in as the seeded demo user.
2. Open League list, select an unlocked league.
3. Join a tournament; watch bot-fill reach 32/32.
4. Enter the bracket, start the first match.
5. Play through using a **dev-only auto-win test mode** (`NEXT_PUBLIC_E2E_TEST_MODE=true`,
   enforced server-side to also require `NODE_ENV !== "production"` — the flag is rejected
   outright in production so it can never be used to cheat a live game) that deterministically
   picks the counter-optimal action against whatever the bot plays.
6. Repeat through quarterfinal/semifinal/final.
7. Assert the Championship screen renders.
8. Assert `/profile` shows increased points and an incremented tournament-win counter.

This mirrors source spec §27 exactly, including the requirement that the auto-win mode is
unusable outside development/test.

## Running

See root `README.md` for exact commands (`npm run test`, `npm run test:integration`,
`npm run test:e2e`).
