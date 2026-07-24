/** winRate = wins / totalMatches * 100; 0 when totalMatches is 0. Rounded to 1 decimal place. */
export function calculateWinRate(wins: number, totalMatches: number): number {
  if (totalMatches <= 0) return 0;
  return Math.round((wins / totalMatches) * 1000) / 10;
}
