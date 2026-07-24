# 15. Future Roadmap

None of these are implemented in the MVP (with one exception noted below). Each row notes the
seam already in place that makes adding it additive rather than a rewrite.

**Friends is now implemented** — see `src/features/friends/`, the `Friendship` model in
`prisma/schema.prisma`, and the `/friends` screen. Scope: send/accept/decline/cancel a friend
request by username, list friends, unfriend. Friend battles (challenging a friend directly to a
match) are still a future extension — see the seam note below, unchanged.

| Feature | Seam already in place |
|---|---|
| Friend battles (challenge a specific friend) | `MatchChannel` abstraction + `TournamentParticipant` already models `HUMAN` opponents generically; a friend-challenge flow would create a 2-participant "tournament" using the same bracket/match/session machinery. The new `Friendship` table already identifies who is eligible to be challenged. |
| Spectating | `GameSession.state` is already server-stored and redaction-on-read is the only game-specific rule; a read-only viewer route can reuse the same session repository with a different redaction policy. |
| Ranking / leaderboards | `PlayerProfile.totalPoints` + `PlayerGameStats` already aggregate everything a leaderboard query needs; add a read-model/materialized view, no write-path changes. |
| Seasons + demotion | `league-progress.service` is already a pure function of `(points, leagues)` rather than a one-way ratchet; a season-reset job and a demotion check are new callers of the same service, not new logic. |
| Guilds / chat / stamps | New feature module under `features/guilds`, `features/chat`; no existing module needs to change. |
| Private tournaments / passcode join | `Tournament` already has `leagueId`+`status`; add `visibility` + `joinCode` columns and a join-by-code repository method — bracket/match code is agnostic to how participants were recruited. |
| Items / avatars / gacha / shop | `CosmeticItem` table already exists and is category-agnostic (`category` field); shop/gacha are new write paths into the same table plus a currency ledger modeled after `PointTransaction`. |
| Daily missions / season pass | New `features/missions` module reading existing match/tournament events; reward grants reuse `points.service`/`cosmetics` unlock plumbing. |
| Replay / analysis | `GameAction` is already a full append-only log per session — a replay viewer is a read-only feature over existing data. |
| Reporting / blocking | New tables + moderation feature module; doesn't intersect game/tournament logic. |
| Admin panel | Every configurable entity is already a normal table read through a repository, not a hardcoded constant — an admin UI is CRUD screens over existing repositories. |
| Announcements / maintenance mode | `Announcement`-shaped table (not yet added) surfaced on Home; a `MaintenanceMode` flag read in the root layout can short-circuit rendering app-wide without touching feature code. |
| i18n | All player-facing copy already routes through `config/app.ts`/`config/games.ts`/`config/leagues.ts` strings rather than being inlined in JSX in most screens; introducing a message-catalog layer is a substitution at that config boundary. |
| PWA / native wrapper | Mobile-first layout, safe-area handling, and no desktop-only interactions are already in place; adding a manifest + service worker is additive. Native app wrapping (Capacitor/etc.) consumes the same web build. |
| True realtime PvP | Swap `infrastructure/realtime/long-poll-channel.ts` for a WebSocket/Supabase Realtime implementation of the same `MatchChannel` interface; `use-game-session.ts` and every screen using it are unaffected. |
