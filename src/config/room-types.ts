export interface RoomTypeConfig {
  code: "SMALL" | "MEDIUM" | "LARGE" | "SUITE";
  name: string;
  description: string;
  /** 家具配置上限 */
  capacity: number;
  /** Price to buy this size directly — only ever charged for SMALL, the entry purchase. */
  purchasePrice: number;
  /** Cost to upgrade INTO this size from the previous one. 0 for SMALL. */
  upgradePrice: number;
  /** League code (see config/leagues.ts) required to purchase/upgrade into this room size.
   * Already-owned rooms are never repossessed if the player later drops below this league. */
  requiredLeagueCode: string;
  width: number;
  height: number;
  sortOrder: number;
}

/**
 * The 4 マイルーム sizes. Deliberately gated by increasingly higher leagues and priced so the
 * full progression (小→中→大→特大, cumulative 42,100 賞金) takes real sustained tournament
 * play — a single Bronze-league championReward is 500 (config/points.ts's BASE_CHAMPION_PRIZE),
 * so even SMALL takes more than one win.
 */
export const ROOM_TYPES: RoomTypeConfig[] = [
  {
    code: "SMALL",
    name: "小部屋",
    description: "すべての挑戦者が最初に手にする、最低限の内装のワンルーム。",
    capacity: 4,
    purchasePrice: 600,
    upgradePrice: 0,
    requiredLeagueCode: "BRONZE",
    width: 4,
    height: 4,
    sortOrder: 1,
  },
  {
    code: "MEDIUM",
    name: "中部屋",
    description: "壁面装飾やラグを置けるようになった、少し広い個室。",
    capacity: 6,
    purchasePrice: 0,
    upgradePrice: 2500,
    requiredLeagueCode: "SILVER",
    width: 6,
    height: 5,
    sortOrder: 2,
  },
  {
    code: "LARGE",
    name: "大部屋",
    description: "複数エリアを表現できる、高級感のある広い部屋。",
    capacity: 10,
    purchasePrice: 0,
    upgradePrice: 9000,
    requiredLeagueCode: "DIAMOND",
    width: 8,
    height: 7,
    sortOrder: 3,
  },
  {
    code: "SUITE",
    name: "特大スイート",
    description: "最上位リーグにふさわしい、VIPルームやペントハウス風の特別な部屋。",
    capacity: 15,
    purchasePrice: 0,
    upgradePrice: 30000,
    requiredLeagueCode: "EMPEROR",
    width: 10,
    height: 9,
    sortOrder: 4,
  },
];

export function getRoomTypeByCode(code: string): RoomTypeConfig | undefined {
  return ROOM_TYPES.find((r) => r.code === code);
}

/** The room size that upgrading from `code` reaches, or null if already at the max size. */
export function getNextRoomType(code: string): RoomTypeConfig | undefined {
  const current = ROOM_TYPES.find((r) => r.code === code);
  if (!current) return undefined;
  return ROOM_TYPES.find((r) => r.sortOrder === current.sortOrder + 1);
}
