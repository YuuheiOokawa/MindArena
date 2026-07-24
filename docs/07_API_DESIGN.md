# 07. API Design

All handlers return `ApiResponse<T>` (see `04_ARCHITECTURE.md`). Mutations that change server
state (join tournament, submit action, etc.) are Route Handlers under `app/api/**`, called from
client hooks — this keeps the "server is authoritative, client polls/pushes" model explicit.
Server Actions are used only for simple form submissions with no read-back requirement
(register, update settings).

## Auth

| Action | Method/Path | Notes |
|---|---|---|
| Register | `POST /api/auth/register` | Zod-validated, bcrypt hash, creates `User` + `PlayerProfile` in one transaction |
| Login | Auth.js `signIn("credentials", …)` | username-or-email resolved server-side |
| Logout | Auth.js `signOut()` | |
| Current user | `GET /api/auth/session` (Auth.js) + `GET /api/profile/me` for app data | |

## Profile

| Action | Method/Path |
|---|---|
| Get profile | `GET /api/profile/me` |
| Get game stats | `GET /api/profile/me/game-stats` |
| Get match history | `GET /api/profile/me/history?cursor=&limit=` |
| Update cosmetic selection | `PATCH /api/profile/me/cosmetics` |
| Update settings | `PATCH /api/profile/me/settings` |

## Leagues

| Action | Method/Path |
|---|---|
| List leagues | `GET /api/leagues` |
| League detail | `GET /api/leagues/[leagueId]` |
| Unlock status | derived client-side from list response (`unlockedAt totalPoints`) — no extra round trip |

## Tournaments

| Action | Method/Path |
|---|---|
| Join / create | `POST /api/tournaments/join` `{ leagueId }` |
| Get tournament | `GET /api/tournaments/[id]` |
| Fill bots (internal, triggered by join once recruiting stalls or explicit "fill now" in dev) | `POST /api/tournaments/[id]/fill-bots` |
| Generate bracket (internal, auto-fires at 32/32) | `POST /api/tournaments/[id]/generate-bracket` |
| Next match for me | `GET /api/tournaments/[id]/my-next-match` |
| Advance / resume state | `GET /api/tournaments/[id]/resume` |

## Games

| Action | Method/Path |
|---|---|
| Start/resume session | `POST /api/matches/[matchId]/session` |
| Submit action | `POST /api/matches/[matchId]/session/actions` `{ round, actionType, actionData }` |
| Poll round/opponent state | `GET /api/matches/[matchId]/session` |
| Final result | `GET /api/matches/[matchId]/result` |

## Points

| Action | Method/Path |
|---|---|
| Balance | part of `GET /api/profile/me` |
| History | `GET /api/points/history?cursor=&limit=` |
| Award (internal only, called from match-result finalization, never from client) | `points.service` invoked server-side inside the match-result transaction |

## Validation & ownership

Every mutating handler: (1) resolves the session user via Auth.js, (2) loads the owning
resource through its repository, (3) asserts the session user is the participant/profile owner
before doing anything, (4) validates the body with a Zod schema from `lib/validation/*`. See
`12_SECURITY.md`.
