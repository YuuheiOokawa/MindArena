const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD calendar date in JST (no DST, so a fixed +9h offset is always correct). */
export function toJstDateKey(date: Date): string {
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** True once the JST calendar date has advanced past the last claim (never claimed = always true). */
export function canClaimDailyBonus(lastClaimedAt: Date | null, now: Date): boolean {
  if (!lastClaimedAt) return true;
  return toJstDateKey(lastClaimedAt) !== toJstDateKey(now);
}

/** The streak day (1-7, see config/daily-bonus.ts's cycle) the NEXT claim pays out for —
 * continues the streak only if the last claim was exactly the JST calendar day before `now`;
 * any gap (a missed day, or no prior claim at all) restarts the cycle at day 1. */
export function computeNextStreakDay(lastClaimedAt: Date | null, currentStreak: number, now: Date): number {
  if (!lastClaimedAt) return 1;
  const wasClaimedYesterday = toJstDateKey(lastClaimedAt) === toJstDateKey(new Date(now.getTime() - DAY_MS));
  return wasClaimedYesterday ? currentStreak + 1 : 1;
}

/** The UTC instant of JST midnight for `date`'s JST calendar day — a race-safe DB WHERE guard
 * ("has this player already claimed since today's JST midnight") without needing raw SQL. */
export function startOfJstDay(date: Date): Date {
  const key = toJstDateKey(date);
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() - JST_OFFSET_MS);
}
