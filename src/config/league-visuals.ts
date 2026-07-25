/** Per-league badge color, keyed by LeagueConfig.themeKey — used as an accent/glow tint
 * alongside the real badge artwork below. */
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

/** Per-league badge artwork, keyed by LeagueConfig.themeKey. Files live under public/leagues/. */
export const LEAGUE_BADGE_ICON: Record<string, string> = {
  bronze: "/leagues/bronze.png",
  silver: "/leagues/silver.png",
  gold: "/leagues/gold.png",
  platinum: "/leagues/platinum.png",
  diamond: "/leagues/diamond.png",
  master: "/leagues/master.png",
  "grand-master": "/leagues/grand-master.png",
  emperor: "/leagues/emperor.png",
  legend: "/leagues/legend.png",
  "mind-king": "/leagues/mind-king.png",
};

export function getLeagueBadgeIcon(themeKey: string): string | null {
  return LEAGUE_BADGE_ICON[themeKey] ?? null;
}
