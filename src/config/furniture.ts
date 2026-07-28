export type FurnitureCategory =
  | "DESK"
  | "CHAIR"
  | "BED"
  | "SOFA"
  | "TABLE"
  | "STORAGE"
  | "LIGHTING"
  | "WALL_ART"
  | "RUG"
  | "PLANT"
  | "GAMING"
  | "TROPHY"
  | "LUXURY"
  | "LEAGUE_EXCLUSIVE";

export type FurnitureRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface FurnitureConfig {
  code: string;
  name: string;
  description: string;
  category: FurnitureCategory;
  rarity: FurnitureRarity;
  price: number;
  /** League code (config/leagues.ts) required to purchase — null = open to every league. */
  requiredLeagueCode: string | null;
  width: number;
  height: number;
  /** No real asset/texture pipeline exists yet — a swatch/icon lookup key the client maps to a
   * color + icon (see components/rooms/furniture-visuals.ts), same shape as
   * config/shop-items.ts's assetKey for profile cosmetics. */
  colorKey: string;
  /** false (default): purchasable once, like every profile CosmeticItem. true: repeat purchases
   * increment quantity instead of erroring, and that many copies can be placed at once. */
  stackable?: boolean;
}

/**
 * Furniture catalog for the マイルーム shop — a parallel, larger catalog to config/shop-items.ts
 * (profile cosmetics). 30 items across all 14 categories requested for this round; balanced
 * across rarity/price/league gates rather than clustering at one tier.
 */
export const FURNITURE_ITEMS: FurnitureConfig[] = [
  // DESK
  { code: "DESK_SIMPLE", name: "シンプルデスク", description: "無駄のない作業机。どんな部屋にも馴染む。", category: "DESK", rarity: "COMMON", price: 200, requiredLeagueCode: null, width: 2, height: 1, colorKey: "wood-light" },
  { code: "DESK_GAMING", name: "ゲーミングデスク", description: "配線を美しく隠せる、対戦仕様の机。", category: "DESK", rarity: "RARE", price: 900, requiredLeagueCode: null, width: 2, height: 1, colorKey: "carbon-black" },
  { code: "DESK_LUXURY_WOOD", name: "高級ウッドデスク", description: "一枚板を贅沢に使った、重厚な執務机。", category: "DESK", rarity: "EPIC", price: 2400, requiredLeagueCode: "GOLD", width: 3, height: 1, colorKey: "wood-dark" },

  // CHAIR
  { code: "CHAIR_FOLDING", name: "折りたたみチェア", description: "軽くてどこにでも置ける簡易チェア。", category: "CHAIR", rarity: "COMMON", price: 150, requiredLeagueCode: null, width: 1, height: 1, colorKey: "steel-gray" },
  { code: "CHAIR_GAMING", name: "ゲーミングチェア", description: "長時間の読み合いでも疲れにくい設計。", category: "CHAIR", rarity: "RARE", price: 700, requiredLeagueCode: null, width: 1, height: 1, colorKey: "neon-red" },
  { code: "CHAIR_LEATHER", name: "レザーチェア", description: "上質な革張りの一人掛けチェア。", category: "CHAIR", rarity: "EPIC", price: 1800, requiredLeagueCode: "PLATINUM", width: 1, height: 1, colorKey: "leather-brown" },

  // BED
  { code: "BED_SINGLE", name: "シングルベッド", description: "最低限の休息をとるためのシンプルなベッド。", category: "BED", rarity: "COMMON", price: 350, requiredLeagueCode: null, width: 2, height: 3, colorKey: "linen-white" },
  { code: "BED_LUXURY", name: "高級ベッド", description: "天蓋付きの、王のためのベッド。", category: "BED", rarity: "LEGENDARY", price: 6500, requiredLeagueCode: "LEGEND", width: 3, height: 3, colorKey: "royal-purple" },

  // SOFA
  { code: "SOFA_COMPACT", name: "コンパクトソファ", description: "小部屋にもちょうどいい2人掛けソファ。", category: "SOFA", rarity: "COMMON", price: 400, requiredLeagueCode: null, width: 2, height: 1, colorKey: "slate-gray" },
  { code: "SOFA_LEATHER", name: "レザーソファ", description: "深く沈み込む、寛ぎのための本革ソファ。", category: "SOFA", rarity: "EPIC", price: 2600, requiredLeagueCode: "DIAMOND", width: 3, height: 1, colorKey: "leather-black" },

  // TABLE
  { code: "TABLE_LOW", name: "ローテーブル", description: "ソファの前に置きたくなる低めのテーブル。", category: "TABLE", rarity: "COMMON", price: 180, requiredLeagueCode: null, width: 2, height: 1, colorKey: "wood-light" },
  { code: "TABLE_GLASS", name: "ガラステーブル", description: "光を反射する、洗練されたガラス天板。", category: "TABLE", rarity: "RARE", price: 850, requiredLeagueCode: null, width: 2, height: 1, colorKey: "glass-clear" },

  // STORAGE
  { code: "STORAGE_BOOKSHELF", name: "本棚", description: "戦術書と記念品を並べる木製の本棚。", category: "STORAGE", rarity: "COMMON", price: 250, requiredLeagueCode: null, width: 1, height: 2, colorKey: "wood-light" },
  { code: "STORAGE_CABINET", name: "キャビネット", description: "収集したアイテムをしまえる金属製の収納棚。", category: "STORAGE", rarity: "RARE", price: 750, requiredLeagueCode: null, width: 2, height: 1, colorKey: "metal-silver" },

  // LIGHTING
  { code: "LIGHT_FLOOR", name: "フロアライト", description: "部屋全体を柔らかく照らすフロアライト。", category: "LIGHTING", rarity: "COMMON", price: 220, requiredLeagueCode: null, width: 1, height: 1, colorKey: "warm-white" },
  { code: "LIGHT_NEON", name: "ネオンライト", description: "心理戦の緊張感を演出する、紫のネオン管。", category: "LIGHTING", rarity: "RARE", price: 950, requiredLeagueCode: null, width: 1, height: 1, colorKey: "neon-purple" },
  { code: "LIGHT_CHANDELIER", name: "シャンデリア", description: "上位リーグの部屋を照らす、金属細工のシャンデリア。", category: "LIGHTING", rarity: "LEGENDARY", price: 7200, requiredLeagueCode: "LEGEND", width: 2, height: 2, colorKey: "gold-shine" },

  // WALL_ART
  { code: "WALLART_PAINTING", name: "壁掛けアート", description: "心理戦をモチーフにした抽象画。", category: "WALL_ART", rarity: "RARE", price: 650, requiredLeagueCode: null, width: 2, height: 1, colorKey: "canvas-mixed" },

  // RUG
  { code: "RUG_BLACK", name: "ブラックラグ", description: "部屋全体を引き締める漆黒のラグ。", category: "RUG", rarity: "COMMON", price: 300, requiredLeagueCode: null, width: 3, height: 2, colorKey: "jet-black" },
  { code: "RUG_PURPLE", name: "パープルラグ", description: "MIND ARENAらしい紫のグラデーションラグ。", category: "RUG", rarity: "RARE", price: 800, requiredLeagueCode: null, width: 3, height: 2, colorKey: "gradient-purple" },

  // PLANT
  { code: "PLANT_SMALL", name: "小型観葉植物", description: "デスクに置ける小さな観葉植物。", category: "PLANT", rarity: "COMMON", price: 120, requiredLeagueCode: null, width: 1, height: 1, colorKey: "green-fresh", stackable: true },
  { code: "PLANT_LARGE", name: "大型観葉植物", description: "床に置く、存在感のある大きな観葉植物。", category: "PLANT", rarity: "RARE", price: 550, requiredLeagueCode: null, width: 1, height: 2, colorKey: "green-deep" },

  // GAMING
  { code: "GAMING_MONITOR", name: "モニター", description: "対戦の振り返りに使える一台のモニター。", category: "GAMING", rarity: "COMMON", price: 400, requiredLeagueCode: null, width: 1, height: 1, colorKey: "screen-dark" },
  { code: "GAMING_BIG_DISPLAY", name: "大型ディスプレイ", description: "壁一面を覆う大型ディスプレイ。", category: "GAMING", rarity: "EPIC", price: 2200, requiredLeagueCode: "PLATINUM", width: 3, height: 1, colorKey: "screen-dark" },
  { code: "GAMING_CONSOLE", name: "ゲーム機", description: "息抜きに使えるゲーム機一式。", category: "GAMING", rarity: "RARE", price: 700, requiredLeagueCode: null, width: 1, height: 1, colorKey: "console-white" },
  { code: "GAMING_SPEAKER", name: "スピーカー", description: "低音まで響く据え置きスピーカー。", category: "GAMING", rarity: "RARE", price: 600, requiredLeagueCode: null, width: 1, height: 1, colorKey: "metal-black" },

  // TROPHY
  { code: "TROPHY_STAND", name: "優勝トロフィー台", description: "獲得したトロフィーを飾るための専用台。", category: "TROPHY", rarity: "EPIC", price: 1600, requiredLeagueCode: "GOLD", width: 1, height: 1, colorKey: "gold-shine" },

  // LUXURY
  { code: "LUXURY_CHESS_SET", name: "VIPチェスセット", description: "駆け引きの象徴として飾られる、大理石のチェスセット。", category: "LUXURY", rarity: "EPIC", price: 3000, requiredLeagueCode: "DIAMOND", width: 1, height: 1, colorKey: "marble-white" },

  // LEAGUE_EXCLUSIVE
  { code: "LEAGUE_EMBLEM", name: "リーグエンブレム", description: "現在の到達リーグを象徴する紋章の壁飾り。", category: "LEAGUE_EXCLUSIVE", rarity: "EPIC", price: 2000, requiredLeagueCode: "MASTER", width: 1, height: 1, colorKey: "emblem-metal" },
  { code: "HOLOGRAM_DECOR", name: "ホログラム装飾", description: "MIND KINGだけが手にできる、浮遊するホログラム装飾。", category: "LEAGUE_EXCLUSIVE", rarity: "LEGENDARY", price: 8000, requiredLeagueCode: "MIND_KING", width: 1, height: 1, colorKey: "hologram-cyan" },
];

export function getFurnitureByCode(code: string): FurnitureConfig | undefined {
  return FURNITURE_ITEMS.find((f) => f.code === code);
}
