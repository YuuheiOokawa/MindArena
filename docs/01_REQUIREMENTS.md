# 01. Requirements & MVP Decisions

Source requirement doc was written in Japanese and covers a very large surface (friends,
guilds, admin panel, PWA, i18n, etc.). This document records the **MVP scope decisions** made
to ship something real and working, and marks what's deferred vs. what's a stub.

## Confirmed MVP scope (must work end-to-end)

- Register / login (username or email + password) / logout.
- Home, League list (10 leagues), Tournament join, Matchmaking, Bracket, Pre-match,
  Game, Result, Championship, Profile, History, Settings screens.
- 4 games behind one `PsychologicalGame` interface: Trust or Betray, Number Bluff,
  Minority Choice, Final Prediction.
- 32-player single-elimination bracket, BOT-filled, 5 wins = champion.
- Server-authoritative match resolution, point awards, point history.
- League unlock by point threshold (no demotion logic executed, but the service signature
  supports it — see `09_TOURNAMENT_DESIGN.md` / `domain/services/league-progress.service.ts`).
- Profile cosmetic tiers (frame) driven by point thresholds from config, not hardcoded JSX.
- Mid-match/mid-tournament reload recovery (server is queried for current state, not just
  client memory).
- Seed data: 10 leagues, 4 games, 50+ bots across 6 personalities, 10+ achievements,
  6+ frames, 10+ titles, 1 demo user (dev-only).
- Unit tests for game resolution/points/bracket/bot/win-rate: real, running, passing.
- One Playwright E2E happy-path spec using a dev-only "auto-win" test mode.

## Ambiguous points — resolved this way

| Topic | Decision |
|---|---|
| Draw resolution | One sudden-death extra round; still tied → server-side coin flip. Implemented as a per-game `resolveTiebreak` hook so it's swappable (`domain/interfaces/tiebreak.ts`). |
| Timeout behavior | Configurable per game config: `onTimeout: "RANDOM" | "FORFEIT_ROUND"`. Default `RANDOM`. |
| Realtime opponent moves | Poll-based `MatchChannel.poll()` behind an interface; a `LongPollMatchChannel` implementation ships now, `WebSocketMatchChannel` documented as a drop-in future implementation (`04_ARCHITECTURE.md`). |
| BOT visibility | `PlayerProfile`-level `showBotTag` setting (Settings screen), default **on** (BOT badge shown). |
| Email verification | Not implemented; `User.emailVerified` column exists and the register flow already writes `null` so verification can be layered on later without a migration. |
| Password reset | UI entry point + Zod-validated form exists (`/forgot-password`) that accepts an email and shows a "check your inbox" confirmation; actual token/email delivery is a documented stub (`SendEmailService` interface with a console-log dev implementation). |
| Demo account | Only seeded when `NODE_ENV !== "production"` (see `prisma/seed.ts`). |
| Admin panel | Not built as UI in MVP, but every "manageable" entity (`League`, `GameType`, `BotProfile`, `Achievement`, `CosmeticItem`, `Announcement`) is a normal DB table read through a repository — no values are hardcoded in components — so an admin CRUD UI can be added later without touching game/tournament code. |
| Guild/chat/ranking/season/shop/etc. | Not implemented; see `15_FUTURE_ROADMAP.md` for how the current domain layer already leaves room for each. Friends (request/accept/list/unfriend) is implemented — see `src/features/friends/`. |

## Definition of done for this MVP (mirrors source spec §34)

See the checklist at the bottom of the root `README.md`; it is kept in sync with this list
and is the actual acceptance test for the build.
