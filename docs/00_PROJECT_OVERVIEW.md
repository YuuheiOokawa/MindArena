# 00. Project Overview — MIND ARENA

## What is this

**MIND ARENA** is a mobile-first (portrait) psychological-battle browser game. Players read
opponents, bluff, and predict choices across short (1–3 minute) mind games, climbing a
32-player single-elimination tournament bracket to win points, unlock leagues, and grow a
visually richer profile.

This is an **original work**. No characters, names, rules, or visual designs are borrowed
from any existing franchise. `MIND ARENA` (title), league names, game names, and all flavor
text live in `src/config/*` and can be renamed without touching game logic.

## Goals

- A player can register, join a tournament, get filled up to 32 with BOTs, play through five
  rounds of short psychological mini-games, win the tournament, and see their profile grow —
  fully working end to end, not just UI mockups.
- The codebase is built so **new games, leagues, bots, items, and modes can be added without
  modifying tournament or profile code** — see `04_ARCHITECTURE.md` and `08_GAME_ENGINE_DESIGN.md`.
- Server is the source of truth for every match outcome and point award (`12_SECURITY.md`).

## Non-goals for the MVP

- Real-time WebSocket PvP (the matchmaking/game-session layer is abstracted so it can be
  swapped in later — see `04_ARCHITECTURE.md §Realtime`).
- Guilds, chat, ranking, seasons, shop, gacha — deliberately deferred, see
  `15_FUTURE_ROADMAP.md`, but the data/service layers do not block adding them. Friends
  (request/accept/list/unfriend) is implemented; friend battles are still deferred.
- League demotion (points only ever unlock leagues going up in the MVP; the multiplier/points
  service is already shaped to support demotion later).

## Tech stack summary

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui-style primitives |
| State | Zustand (client UI/session state), server is authoritative for game truth |
| Forms | React Hook Form + Zod |
| Backend | Next.js Route Handlers + selective Server Actions |
| ORM/DB | Prisma + PostgreSQL (Neon-compatible) |
| Auth | Auth.js (Credentials provider), bcrypt password hashing, login by username OR email |
| Realtime | Polling-based `MatchChannel` abstraction today, swappable for WebSocket/Supabase Realtime |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Deploy target | Vercel + Neon Postgres |

See `04_ARCHITECTURE.md` for the full directory layout and dependency rules.

## How to read these docs

1. `01_REQUIREMENTS.md` — what MVP-scope decisions were made where the spec was ambiguous.
2. `02_SCREEN_LIST.md` / `03_SCREEN_FLOW.md` — every screen and how a user moves between them.
3. `04_ARCHITECTURE.md` — layering rules, directory structure, plugin model.
4. `05_DOMAIN_MODEL.md` — entities, enums, the `PsychologicalGame` plugin interface.
5. `06_DATABASE_DESIGN.md` — Prisma schema + ER relationships.
6. `07_API_DESIGN.md` — every route/action, request/response shape.
7. `08_GAME_ENGINE_DESIGN.md` — how the 4 games plug into one engine.
8. `09_TOURNAMENT_DESIGN.md` — bracket generation, state machine, edge cases.
9. `10_BOT_DESIGN.md` — bot personalities, stats, per-game strategy.
10. `11_UI_DESIGN_SYSTEM.md` — visual language, tokens, component rules.
11. `12_SECURITY.md` — anti-cheat, authorization, validation.
12. `13_TEST_PLAN.md` — unit/integration/E2E coverage.
13. `14_IMPLEMENTATION_PLAN.md` — phased build order actually followed.
14. `15_FUTURE_ROADMAP.md` — what's deliberately deferred and how it plugs in later.
