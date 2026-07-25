import { prisma } from "@/infrastructure/database/prisma";

/**
 * Runs `fn` while holding a Postgres advisory lock scoped to `keys` (typically one or more
 * profile/tournament ids). Concurrent calls that share ANY key serialize: the second waits for
 * the first's lock-holding transaction to commit/rollback before it can even start its own
 * check-then-act logic — closing the classic "double-click / client retry / two friends polling
 * the same tournament at once" race where two requests both read "not yet done" before either
 * has written anything.
 *
 * `fn` is free to do its real work with the normal `prisma` client (or any repository) rather
 * than the lock-holding transaction client — the lock only needs to stay held for the duration
 * of the `await`, which it does since we don't let the wrapping transaction commit until `fn`
 * resolves. `hashtextextended` gives a well-distributed 64-bit lock id from an arbitrary string
 * key so unrelated keys essentially never collide, and the `_xact_lock` variant releases
 * automatically on commit OR rollback (including when `fn` throws), so a thrown AppError can
 * never leak a held lock.
 */
export async function withKeysLock<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
  const sortedUniqueKeys = [...new Set(keys)].sort();
  return prisma.$transaction(
    async (tx) => {
      for (const key of sortedUniqueKeys) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      }
      return fn();
    },
    { timeout: 20_000 },
  );
}

export function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return withKeysLock([key], fn);
}
