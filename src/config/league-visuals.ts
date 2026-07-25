/** Per-league badge color, keyed by LeagueConfig.themeKey. All tiers share the same Gem icon
 * (see home/profile pages) — only the tint changes, echoing a gemstone-rarity progression. */
export const LEAGUE_BADGE_COLOR: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-300",
  gold: "text-arena-gold",
  platinum: "text-cyan-300",
  diamond: "text-sky-400",
  master: "text-violet-400",
  "grand-master": "text-purple-400",
  emperor: "text-rose-400",
  legend: "text-orange-400",
  "mind-king": "text-arena-gold",
};

export function getLeagueBadgeColor(themeKey: string): string {
  return LEAGUE_BADGE_COLOR[themeKey] ?? "text-arena-primary-soft";
}
