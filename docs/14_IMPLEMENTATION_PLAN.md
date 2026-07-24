# 14. Implementation Plan (as executed)

Phases 1–7 from the source spec, adapted:

1. **Design** — this `docs/` set, written and cross-checked before code (this document records
   the order actually followed; see git history for the corresponding commits).
2. **Foundation** — Next.js App Router + TS strict + Tailwind + Prisma + Auth.js scaffolding,
   base layout, logger, `AppError`, `.env.example`.
3. **Domain + config layer** — enums, interfaces, entities, all master data
   (`config/leagues.ts`, `config/games.ts`, etc.) before any UI touches them.
4. **Game engine + 4 games + bots** — pure, unit-testable, built and tested before wiring to DB.
5. **Prisma schema + seed** — once domain shapes were stable, so the schema mirrors the domain
   model instead of the other way around.
6. **UI shell + all 15 screens on mock data** — verifies the screen flow and mobile layout work
   before backend wiring; mock data lives behind the same hook interfaces the real API will
   fill, so wiring real data later is a swap, not a rewrite.
7. **Auth + tournament + points services wired to Prisma**, replacing mocks screen by screen.
8. **Reward/growth pass** — league unlock, profile decoration tiers, achievements, history.
9. **Tests** — unit tests were written alongside each service in step 4/7; integration + E2E
   added once the full loop worked manually.
10. **Polish** — responsive check at 320/390/430px, reduced-motion setting, error/empty states.

## What is genuinely complete vs. scaffolded

This MVP prioritizes a **real, working vertical slice** end-to-end over exhaustively filling
every future-facing surface. `01_REQUIREMENTS.md` and the root `README.md` checklist are the
authoritative list of what's fully working; anything not on that checklist that appears as a
stub is explicitly labeled as such in code comments and this doc, not silently left half-done.
