# 12. Security

## Match integrity

- **Opponent choice concealment.** `GameSession.state` stores both participants' current-round
  actions, but `GET /api/matches/[matchId]/session` strips the opponent's action for the
  requesting participant until both actions are present for that round (`session-codec.ts`
  redaction step) — the endpoint response is participant-specific, not a raw dump of the row.
- **Server-authoritative outcomes.** The client never posts a win/loss/score — only raw
  `PlayerAction`s. `calculateResult`/round resolution runs exclusively server-side inside the
  API route, using the domain game module.
- **No client-trusted points.** Point awards happen only inside the match-result finalization
  transaction (`features/points/award-match-points.ts`), never accept a client-supplied amount.
- **Idempotent rewards.** `MatchResult.tournamentMatchId` is unique; finalization is wrapped in
  `prisma.$transaction` that first checks for an existing `MatchResult` and no-ops (returns the
  existing result) if one is already there — prevents double awarding on retry/duplicate call.
- **Ownership checks.** Every session/action endpoint loads the `TournamentMatch` →
  `TournamentParticipant` chain and asserts `participant.playerId === session.user.id` before
  accepting a `GameAction`; otherwise responds `403 FORBIDDEN` via the shared `AppError` type.
- **Input validation.** Every mutating endpoint validates its body against a Zod schema in
  `lib/validation/*` before touching domain logic; invalid input never reaches a service.
- **Audit log.** Every accepted `GameAction` is persisted (append-only) with participant, round,
  action type/data, and timestamp — this table doubles as the audit log referenced in the
  source spec; nothing is deleted or overwritten.
- **Rate limiting readiness.** All mutating routes go through a single
  `lib/http/with-route-handler.ts` wrapper (auth + error mapping); a token-bucket check can be
  added there later without touching individual routes.

## Auth

- Passwords hashed with `bcryptjs` (cost factor 12), never logged, never returned in any API
  response.
- Auth.js Credentials provider resolves login by username OR email
  (`infrastructure/auth/authorize.ts` does a single query with `OR: [{username}, {email}]`).
- Session strategy: JWT (stateless, Vercel-friendly); session callback attaches `userId` and
  `profileId` for downstream ownership checks without extra queries on every request.

## Secrets

- All secrets via environment variables (`.env.example` documents every key, no default
  values that look like real secrets).
- Demo account (`01_REQUIREMENTS.md`) is excluded from seeding when `NODE_ENV === "production"`.
