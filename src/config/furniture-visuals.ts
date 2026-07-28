import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Book,
  Bed as BedIcon,
  Flower2,
  Gamepad2,
  Gem,
  Image as ImageIcon,
  Lamp,
  LayoutGrid,
  Layers,
  Sofa,
  Sparkles,
  Square,
  Trophy,
} from "lucide-react";
import type { FurnitureCategory, FurnitureRarity } from "@/config/furniture";

export const FURNITURE_CATEGORY_LABEL: Record<FurnitureCategory, string> = {
  DESK: "デスク",
  CHAIR: "チェア",
  BED: "ベッド",
  SOFA: "ソファ",
  TABLE: "テーブル",
  STORAGE: "収納",
  LIGHTING: "照明",
  WALL_ART: "壁面装飾",
  RUG: "床・ラグ",
  PLANT: "観葉植物",
  GAMING: "ゲーム機器",
  TROPHY: "トロフィー・記念品",
  LUXURY: "高級インテリア",
  LEAGUE_EXCLUSIVE: "リーグ限定商品",
};

export const FURNITURE_CATEGORY_ICON: Record<FurnitureCategory, LucideIcon> = {
  DESK: LayoutGrid,
  CHAIR: Armchair,
  BED: BedIcon,
  SOFA: Sofa,
  TABLE: Square,
  STORAGE: Book,
  LIGHTING: Lamp,
  WALL_ART: ImageIcon,
  RUG: Layers,
  PLANT: Flower2,
  GAMING: Gamepad2,
  TROPHY: Trophy,
  LUXURY: Gem,
  LEAGUE_EXCLUSIVE: Sparkles,
};

export const FURNITURE_RARITY_LABEL: Record<FurnitureRarity, string> = {
  COMMON: "コモン",
  RARE: "レア",
  EPIC: "エピック",
  LEGENDARY: "レジェンダリー",
};

/** Badge variant per rarity tier — matches the design system's existing 5-variant Badge, so
 * higher rarity reads as more precious using the same visual language as league/achievement UI. */
export const FURNITURE_RARITY_BADGE_VARIANT: Record<FurnitureRarity, "neutral" | "primary" | "success" | "gold"> = {
  COMMON: "neutral",
  RARE: "primary",
  EPIC: "success",
  LEGENDARY: "gold",
};

/** No real texture/asset pipeline exists yet — colorKey maps to a Tailwind gradient swatch that
 * stands in for the item's artwork, same "config key -> Tailwind class" shape as
 * config/shop-items.ts's BACKGROUND_GRADIENTS. Easy to swap for real sprite/model lookups later
 * (see prisma/schema.prisma's ShopFurnitureItem.colorKey doc comment). */
export const FURNITURE_COLOR_SWATCH: Record<string, string> = {
  "wood-light": "from-amber-700/70 to-amber-900/40",
  "wood-dark": "from-amber-950/80 to-black/40",
  "carbon-black": "from-zinc-700/70 to-black/50",
  "steel-gray": "from-slate-500/60 to-slate-700/40",
  "neon-red": "from-rose-600/60 to-rose-900/40",
  "leather-brown": "from-amber-800/70 to-amber-950/50",
  "leather-black": "from-zinc-800/80 to-black/50",
  "linen-white": "from-stone-300/60 to-stone-500/30",
  "royal-purple": "from-arena-primary/70 to-purple-950/50",
  "slate-gray": "from-slate-600/60 to-slate-800/40",
  "glass-clear": "from-cyan-400/40 to-cyan-700/20",
  "metal-silver": "from-slate-300/60 to-slate-500/40",
  "warm-white": "from-amber-100/50 to-amber-300/30",
  "neon-purple": "from-fuchsia-500/70 to-purple-800/40",
  "gold-shine": "from-arena-gold/70 to-amber-700/40",
  "canvas-mixed": "from-arena-primary/50 to-arena-gold/40",
  "jet-black": "from-zinc-900/80 to-black/60",
  "gradient-purple": "from-fuchsia-600/60 to-arena-primary/40",
  "green-fresh": "from-emerald-500/60 to-emerald-800/40",
  "green-deep": "from-emerald-700/70 to-emerald-950/50",
  "screen-dark": "from-slate-800/80 to-black/50",
  "console-white": "from-stone-200/50 to-stone-400/30",
  "metal-black": "from-zinc-800/70 to-black/50",
  "marble-white": "from-stone-100/50 to-stone-300/30",
  "emblem-metal": "from-arena-gold/60 to-slate-700/40",
  "hologram-cyan": "from-cyan-400/60 to-arena-primary/40",
};

export function getFurnitureSwatch(colorKey: string): string {
  return FURNITURE_COLOR_SWATCH[colorKey] ?? "from-arena-primary/30 to-transparent";
}
