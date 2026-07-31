/**
 * Process-local memoization for read-mostly, rarely-changing DB reads (league/game/achievement/
 * room/furniture master data — config-as-source-of-truth tables upserted by prisma/seed.ts, never
 * mutated by normal app traffic). These tables back nearly every page load, so caching them is
 * the single highest-leverage way to cut DB round-trips under concurrent load without touching
 * any player-specific query.
 *
 * Deliberately NOT used for anything player-specific (profile, points, achievements unlocked,
 * etc.) — only for the small set of "config mirrored into the DB" tables. A production reseed
 * (e.g. adding a new achievement) takes up to `ttlMs` to become visible to already-running
 * server processes — an accepted, documented tradeoff for the load reduction.
 */
export function memoizeWithTtl<T>(loader: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let cached: { value: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  return async () => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.value;
    // Collapse concurrent cache-miss callers into a single in-flight DB query instead of each
    // firing its own request (a thundering-herd guard for the moment the TTL expires under load).
    if (pending) return pending;

    pending = loader()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
