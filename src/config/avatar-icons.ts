export interface AvatarIconConfig {
  id: string;
  /** lucide-react icon component name — resolved via a small lookup map at render sites. */
  icon: string;
  colorClass: string;
  name: string;
}

/**
 * A curated set of icon-based avatars every player can freely pick from (no real character
 * portraits exist yet — see the icon-asset audit; this is a fully-functional stand-in that can
 * later be swapped for illustrated art without changing selectedAvatarIconId's shape).
 */
export const AVATAR_ICONS: AvatarIconConfig[] = [
  { id: "brain", icon: "Brain", colorClass: "text-arena-primary-soft", name: "頭脳" },
  { id: "eye", icon: "Eye", colorClass: "text-sky-400", name: "洞察" },
  { id: "ghost", icon: "Ghost", colorClass: "text-slate-300", name: "幻影" },
  { id: "skull", icon: "Skull", colorClass: "text-zinc-300", name: "無慈悲" },
  { id: "crown", icon: "Crown", colorClass: "text-arena-gold", name: "王者" },
  { id: "flame", icon: "Flame", colorClass: "text-arena-danger", name: "情熱" },
  { id: "zap", icon: "Zap", colorClass: "text-yellow-400", name: "閃光" },
  { id: "swords", icon: "Swords", colorClass: "text-rose-400", name: "闘志" },
  { id: "shield", icon: "Shield", colorClass: "text-emerald-400", name: "鉄壁" },
  { id: "moon", icon: "Moon", colorClass: "text-indigo-300", name: "静寂" },
  { id: "star", icon: "Star", colorClass: "text-amber-300", name: "輝き" },
  { id: "sparkles", icon: "Sparkles", colorClass: "text-fuchsia-300", name: "神秘" },
];

export function getAvatarIcon(id: string | null | undefined): AvatarIconConfig | undefined {
  if (!id) return undefined;
  return AVATAR_ICONS.find((a) => a.id === id);
}
