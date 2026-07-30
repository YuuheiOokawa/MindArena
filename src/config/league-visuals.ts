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
  void: "text-red-500",
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

/**
 * How opulent a league's presentation should feel, keyed by LeagueConfig.themeKey — used by the
 * profile screen's header card so higher leagues visibly read as more prestigious, not just a
 * different badge icon. `level` gates which effects stack (see profile/page.tsx):
 *   1 (Bronze/Silver)          — tinted border only
 *   2 (Gold/Platinum)          — + gradient wash + a soft static glow
 *   3 (Diamond/Master/GM)      — + the glow pulses (arena-glow-pulse)
 *   4 (Emperor/Legend/MindKing)— + a light shimmer sweep (arena-shimmer)
 */
export interface LeagueLuxuryTier {
  level: 1 | 2 | 3 | 4;
  /** Tailwind gradient stops for the header card's background wash. */
  headerGradient: string;
  /** Tailwind border-color class (with opacity) for the header card. */
  border: string;
  /** Tailwind border-color class (solid) for the avatar ring. */
  avatarBorder: string;
  /** Tailwind classes for the league Badge chip (replaces the generic "primary" variant). */
  badgeClass: string;
  /** rgba() used for both the box-shadow glow and --arena-glow-color/--arena-shimmer-color. */
  glowColor: string;
  /** Mind King exclusive: replaces the gradient border + shimmer with a spinning rainbow ring,
   * a soft rainbow halo, and twinkling sparkles (see components/common/rainbow-luxury.tsx) — the
   * single top league gets a presentation no other tier shares, rather than just a brighter gold. */
  rainbow?: boolean;
}

export const LEAGUE_LUXURY: Record<string, LeagueLuxuryTier> = {
  bronze: {
    level: 1,
    headerGradient: "from-amber-700/10 to-transparent",
    border: "border-amber-700/30",
    avatarBorder: "border-amber-700",
    badgeClass: "bg-amber-700/10 text-amber-400 border-amber-700/30",
    glowColor: "rgba(180, 83, 9, 0.3)",
  },
  silver: {
    level: 1,
    headerGradient: "from-slate-300/10 to-transparent",
    border: "border-slate-300/25",
    avatarBorder: "border-slate-300",
    badgeClass: "bg-slate-300/10 text-slate-300 border-slate-300/25",
    glowColor: "rgba(203, 213, 225, 0.3)",
  },
  gold: {
    level: 2,
    headerGradient: "from-arena-gold/15 via-arena-gold/5 to-transparent",
    border: "border-arena-gold/40",
    avatarBorder: "border-arena-gold",
    badgeClass: "bg-arena-gold/15 text-arena-gold-soft border-arena-gold/30",
    glowColor: "rgba(224, 178, 86, 0.35)",
  },
  platinum: {
    level: 2,
    headerGradient: "from-cyan-300/15 via-cyan-300/5 to-transparent",
    border: "border-cyan-300/40",
    avatarBorder: "border-cyan-300",
    badgeClass: "bg-cyan-300/10 text-cyan-200 border-cyan-300/30",
    glowColor: "rgba(103, 232, 249, 0.3)",
  },
  diamond: {
    level: 3,
    headerGradient: "from-sky-400/20 via-arena-primary/10 to-transparent",
    border: "border-sky-400/50",
    avatarBorder: "border-sky-400",
    badgeClass: "bg-sky-400/10 text-sky-300 border-sky-400/30",
    glowColor: "rgba(56, 189, 248, 0.4)",
  },
  master: {
    level: 3,
    headerGradient: "from-violet-400/20 via-arena-primary/10 to-transparent",
    border: "border-violet-400/50",
    avatarBorder: "border-violet-400",
    badgeClass: "bg-violet-400/10 text-violet-300 border-violet-400/30",
    glowColor: "rgba(167, 139, 250, 0.4)",
  },
  "grand-master": {
    level: 3,
    headerGradient: "from-purple-400/20 via-arena-primary/15 to-transparent",
    border: "border-purple-400/50",
    avatarBorder: "border-purple-400",
    badgeClass: "bg-purple-400/10 text-purple-300 border-purple-400/30",
    glowColor: "rgba(192, 132, 252, 0.45)",
  },
  emperor: {
    level: 4,
    headerGradient: "from-rose-400/25 via-arena-gold/10 to-transparent",
    border: "border-rose-400/60",
    avatarBorder: "border-rose-400",
    badgeClass: "bg-rose-400/10 text-rose-300 border-rose-400/30",
    glowColor: "rgba(251, 113, 133, 0.5)",
  },
  legend: {
    level: 4,
    headerGradient: "from-orange-400/25 via-arena-gold/15 to-transparent",
    border: "border-orange-400/60",
    avatarBorder: "border-orange-400",
    badgeClass: "bg-orange-400/10 text-orange-300 border-orange-400/30",
    glowColor: "rgba(251, 146, 60, 0.5)",
  },
  "mind-king": {
    level: 4,
    headerGradient: "from-arena-gold/20 via-arena-primary/15 to-transparent",
    border: "border-arena-gold/70",
    avatarBorder: "border-arena-gold",
    badgeClass: "bg-arena-gold/20 text-arena-gold border-arena-gold/50",
    glowColor: "rgba(224, 178, 86, 0.65)",
    rainbow: true,
  },
  // 裏リーグ — deliberately NOT rainbow: past the king's radiance, the void reads as an ominous
  // blood-red darkness, visually apart from every public tier.
  void: {
    level: 4,
    headerGradient: "from-red-900/40 via-black/30 to-transparent",
    border: "border-red-600/70",
    avatarBorder: "border-red-600",
    badgeClass: "bg-red-900/30 text-red-400 border-red-600/50",
    glowColor: "rgba(220, 38, 38, 0.6)",
  },
};

const DEFAULT_LUXURY: LeagueLuxuryTier = {
  level: 1,
  headerGradient: "from-arena-primary/10 to-transparent",
  border: "border-arena-primary/30",
  avatarBorder: "border-arena-primary",
  badgeClass:
    "bg-arena-primary/15 text-arena-primary-soft border-arena-primary/30",
  glowColor: "rgba(139, 92, 246, 0.3)",
};

export function getLeagueLuxury(themeKey: string): LeagueLuxuryTier {
  return LEAGUE_LUXURY[themeKey] ?? DEFAULT_LUXURY;
}
