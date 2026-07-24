# 03. Screen Flow

```
Splash
  ├─ no session ──────────────► Login ─┬─► Register ─► Onboarding ─► Home
  │                                    └─► Forgot Password
  └─ has session ─────────────────────────────────────────────────► Home

Home ─┬─► League List ─► League Detail ─► Tournament Join ─► Matchmaking
      │                                                          │
      │        ┌─────────────────────────────────────────────────┘
      │        ▼
      │     Bracket ─► Pre-Match ─► Game ─► Match Result ─┬─► Bracket (next round)
      │                                                    └─► Championship ─► Home
      │
      ├─► History
      ├─► Profile ─► Settings
      └─► Announcements (inline on Home)
```

## Key transition rules

- **Home → Tournament join**: only reachable through a League the player has unlocked.
- **Tournament join → Matchmaking**: creates (or joins) a `RECRUITING` tournament for that
  league; if this is the player's first participant slot the tournament is created with 31
  reserved BOT seats.
- **Matchmaking → Bracket**: once participant count hits `maxPlayers` (32), server marks the
  tournament `READY`, generates the bracket, flips to `IN_PROGRESS`, and the client is
  redirected automatically (poll-driven).
- **Bracket → Pre-match**: only the match card containing the current player and being
  `READY`/`WAITING` is tappable; other cards are read-only.
- **Pre-match → Game**: starts (or resumes) a `GameSession` for that `TournamentMatch`.
- **Game → Match result**: only the server-computed `MatchResult` is shown; the client never
  renders a result it computed locally.
- **Match result → Bracket or Championship**: if the player's `TournamentParticipant.status`
  is still `ACTIVE` and the tournament isn't `COMPLETED`, return to Bracket; if the player just
  won the final, go to Championship instead.
- **Reload/back button** at any point inside a tournament: the route loader re-fetches
  tournament/match/session state from the server and redirects to whichever screen matches the
  *current* server state (see `29` in the source spec, implemented in
  `features/tournaments/resume.ts`).

## Full-screen "focus" mode

Matchmaking, Pre-match, Game, Match Result, and Championship all render inside a layout that
hides the bottom navigation and back-swipe affordances to prevent accidental exits mid-match.
