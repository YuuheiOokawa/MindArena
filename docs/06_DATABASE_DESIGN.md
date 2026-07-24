# 06. Database Design

Full source of truth is `prisma/schema.prisma`. This doc summarizes relationships and the
rationale behind a few non-obvious choices.

## ER overview

```
User 1─1 PlayerProfile 1─* PointTransaction
                       1─* PlayerGameStats *─1 GameType
                       1─* PlayerAchievement *─1 Achievement
                       *─1 League (currentLeagueId)
                       *─1 CosmeticItem (selectedFrameId) [optional]

League 1─* Tournament
Tournament 1─* TournamentParticipant *─(0..1)─ PlayerProfile
                                     *─(0..1)─ BotProfile
Tournament 1─* TournamentMatch
TournamentMatch *─1 GameType
TournamentMatch 1─1 GameSession 1─* GameAction *─1 TournamentParticipant
TournamentMatch 1─1 MatchResult
```

## Notable design decisions

- **`TournamentParticipant.playerId` XOR `botId`.** Enforced at the application layer
  (`repositories/tournament-participant.repository.ts` throws if both/neither are set) and
  documented via a Prisma `@@check` comment; Postgres CHECK constraints aren't expressible
  directly in `schema.prisma` today, so it's additionally enforced with a raw SQL
  `CONSTRAINT` added in the initial migration (`ALTER TABLE ... ADD CONSTRAINT participant_xor
  CHECK ((player_id IS NOT NULL) <> (bot_id IS NOT NULL))`).
- **`GameSession.state` is `Json`.** It stores the live `GameState` for the active game plugin.
  Type safety is preserved by never reading this column outside
  `features/games/core/session-codec.ts`, which parses it with a per-game Zod schema keyed by
  `gameTypeId` before handing it to domain code — so "type-safe JSON" is enforced at the one
  boundary that touches it, not by trusting the column.
- **`GameType.configuration` is `Json`** for the same reason — per-game tunables (timer
  overrides, round count) validated by a per-game Zod schema in
  `features/games/<game>/config.schema.ts`.
- **`PlayerGameStats.winRate` is NOT stored** — it's derived on read via `win-rate.util.ts`
  from `wins`/`matches` to avoid drift; the column exists only as a denormalized cache column
  is intentionally omitted from the MVP schema (matches source spec's "may skip storing" note).
- **`PointTransaction` is append-only.** `balanceBefore`/`balanceAfter` are snapshotted at
  write time inside the same DB transaction that updates `PlayerProfile.totalPoints`, so the
  ledger is always reconstructable and auditable.
- **Idempotency.** `MatchResult` has a unique constraint on `tournamentMatchId` — a match can
  only ever produce one result row, which is what prevents double point awards (see
  `12_SECURITY.md`).

## Enums map 1:1 to `domain/enums` (see `05_DOMAIN_MODEL.md`) via Prisma `enum` blocks so
Postgres enforces valid values at the DB layer in addition to TypeScript enforcing it at the
type layer.

## Migrations

MVP ships a single baseline migration generated from `schema.prisma`
(`npx prisma migrate dev --name init`). See README for exact commands.
