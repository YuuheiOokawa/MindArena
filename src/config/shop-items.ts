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
  {
    id: "bg-mirage",
    code: "BG_MIRAGE",
    name: "蜃気楼背景",
    category: "BACKGROUND",
    price: 350,
    description: "揺らめく蜃気楼が現実と虚構を惑わす背景。",
    assetKey: "mirage",
  },
  {
    id: "bg-tempest",
    code: "BG_TEMPEST",
    name: "嵐背景",
    category: "BACKGROUND",
    price: 450,
    description: "吹き荒れる嵐を纏う背景。",
    assetKey: "tempest",
  },
  {
    id: "bg-eclipse",
    code: "BG_ECLIPSE",
    name: "日食背景",
    category: "BACKGROUND",
    price: 650,
    description: "光と影が交錯する日食の背景。",
    assetKey: "eclipse",
  },
  {
    id: "bg-nova",
    code: "BG_NOVA",
    name: "超新星背景",
    category: "BACKGROUND",
    price: 1000,
    description: "すべてを塗り替える超新星の背景。",
    assetKey: "nova",
  },
  {
    id: "badge-crown",
    code: "BADGE_CROWN",
    name: "王者の証",
    category: "BADGE",
    price: 800,
    description: "頂点に立つ者だけが纏うバッジ。",
    assetKey: "crown",
  },
  {
    id: "badge-zap",
    code: "BADGE_ZAP",
    name: "閃光の証",
    category: "BADGE",
    price: 250,
    description: "一瞬の判断力を示すバッジ。",
    assetKey: "zap",
  },
  {
    id: "badge-shield",
    code: "BADGE_SHIELD",
    name: "鉄壁の証",
    category: "BADGE",
    price: 300,
    description: "揺るがぬ守りを示すバッジ。",
    assetKey: "shield",
  },
  {
    id: "badge-eye",
    code: "BADGE_EYE",
    name: "洞察の証",
    category: "BADGE",
    price: 400,
    description: "相手の心を見抜く洞察力を示すバッジ。",
    assetKey: "eye",
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
  mirage: "from-arena-primary-soft/25 via-arena-silver/10 to-transparent",
  tempest: "from-arena-silver/25 via-arena-primary-dark/20 to-transparent",
  eclipse: "from-arena-bg via-arena-gold/15 to-transparent",
  nova: "from-arena-gold/35 via-arena-danger/20 to-transparent",
};

export const BADGE_ICON_KEYS: Record<string, string> = {
  flame: "Flame",
  star: "Star",
  skull: "Skull",
  diamond: "Gem",
  crown: "Crown",
  zap: "Zap",
  shield: "Shield",
  eye: "Eye",
};
