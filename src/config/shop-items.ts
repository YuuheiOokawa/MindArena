export interface ShopItemConfig {
  id: string;
  code: string;
  name: string;
  category: "BACKGROUND" | "BADGE";
  price: number;
  description: string;
  /** BACKGROUND: a gradient key rendered by resolveBackgroundGradient. BADGE: a lucide icon key rendered by resolveBadgeIcon. */
  assetKey: string;
}

/**
 * Shop-exclusive cosmetics, purchasable with prizeCurrency (earned by winning tournaments — see
 * awardChampionPrize in features/tournaments/progress.service.ts). Unlike frames/titles, these
 * are never auto-unlocked by totalPoints; ownership is tracked in CosmeticPurchase.
 */
export const SHOP_ITEMS: ShopItemConfig[] = [
  {
    id: "bg-aurora",
    code: "BG_AURORA",
    name: "オーロラ背景",
    category: "BACKGROUND",
    price: 300,
    description: "紫と金が揺らめくオーロラ背景。",
    assetKey: "aurora",
  },
  {
    id: "bg-ember",
    code: "BG_EMBER",
    name: "エンバー背景",
    category: "BACKGROUND",
    price: 300,
    description: "燃え上がる闘志を纏う背景。",
    assetKey: "ember",
  },
  {
    id: "bg-abyss",
    code: "BG_ABYSS",
    name: "深淵背景",
    category: "BACKGROUND",
    price: 500,
    description: "静かな深淵を思わせる背景。",
    assetKey: "abyss",
  },
  {
    id: "bg-royal",
    code: "BG_ROYAL",
    name: "ロイヤル背景",
    category: "BACKGROUND",
    price: 800,
    description: "王者にふさわしい荘厳な背景。",
    assetKey: "royal",
  },
  {
    id: "badge-flame",
    code: "BADGE_FLAME",
    name: "情熱の証",
    category: "BADGE",
    price: 200,
    description: "闘志を示すバッジ。",
    assetKey: "flame",
  },
  {
    id: "badge-star",
    code: "BADGE_STAR",
    name: "輝きの証",
    category: "BADGE",
    price: 200,
    description: "輝かしい功績を示すバッジ。",
    assetKey: "star",
  },
  {
    id: "badge-skull",
    code: "BADGE_SKULL",
    name: "無慈悲の証",
    category: "BADGE",
    price: 350,
    description: "冷徹な読み合いを示すバッジ。",
    assetKey: "skull",
  },
  {
    id: "badge-diamond",
    code: "BADGE_DIAMOND",
    name: "至高の証",
    category: "BADGE",
    price: 600,
    description: "至高の存在を示すバッジ。",
    assetKey: "diamond",
  },
];

export function getShopItem(id: string): ShopItemConfig | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export const BACKGROUND_GRADIENTS: Record<string, string> = {
  aurora: "from-arena-primary/25 via-arena-gold/10 to-transparent",
  ember: "from-arena-danger/25 via-arena-gold/15 to-transparent",
  abyss: "from-arena-primary-dark/40 via-arena-surface to-transparent",
  royal: "from-arena-gold/25 via-arena-primary/20 to-transparent",
};

export const BADGE_ICON_KEYS: Record<string, string> = {
  flame: "Flame",
  star: "Star",
  skull: "Skull",
  diamond: "Gem",
};
