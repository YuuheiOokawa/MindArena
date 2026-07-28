export type AchievementConditionType =
  | "TOTAL_MATCHES"
  | "TOTAL_WINS"
  | "WIN_STREAK"
  | "FINALS_REACHED"
  | "TOURNAMENT_WINS"
  | "TOURNAMENT_ENTRIES"
  | "ALL_GAMES_PLAYED"
  | "WIN_RATE_MIN_10_MATCHES"
  | "LEAGUE_REACHED";

export interface AchievementConfig {
  code: string;
  name: string;
  description: string;
  conditionType: AchievementConditionType;
  conditionValue: number;
  rewardPoints: number;
  /** Excluded from the catalog's locked view — name/description/progress stay concealed until
   * unlocked, so the player discovers it by surprise rather than chasing a visible checklist. */
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementConfig[] = [
  { code: "FIRST_MATCH", name: "初めての対戦", description: "はじめて心理戦をプレイした。", conditionType: "TOTAL_MATCHES", conditionValue: 1, rewardPoints: 10 },
  { code: "FIRST_WIN", name: "初勝利", description: "はじめて対戦に勝利した。", conditionType: "TOTAL_WINS", conditionValue: 1, rewardPoints: 20 },
  { code: "WIN_STREAK_3", name: "3連勝", description: "3連勝を達成した。", conditionType: "WIN_STREAK", conditionValue: 3, rewardPoints: 30 },
  { code: "WIN_STREAK_5", name: "5連勝", description: "5連勝を達成した。", conditionType: "WIN_STREAK", conditionValue: 5, rewardPoints: 50 },
  { code: "FIRST_FINAL", name: "初めての決勝進出", description: "はじめて決勝に進出した。", conditionType: "FINALS_REACHED", conditionValue: 1, rewardPoints: 60 },
  { code: "FIRST_CHAMPION", name: "初優勝", description: "はじめてトーナメントで優勝した。", conditionType: "TOURNAMENT_WINS", conditionValue: 1, rewardPoints: 100 },
  { code: "TOURNAMENTS_10", name: "トーナメント10回参加", description: "10回のトーナメントに参加した。", conditionType: "TOURNAMENT_ENTRIES", conditionValue: 10, rewardPoints: 40 },
  { code: "WINS_10", name: "10勝達成", description: "通算10勝を達成した。", conditionType: "TOTAL_WINS", conditionValue: 10, rewardPoints: 40 },
  { code: "ALL_GAMES", name: "全ゲームを1回ずつプレイ", description: "4種類すべての心理戦をプレイした。", conditionType: "ALL_GAMES_PLAYED", conditionValue: 4, rewardPoints: 30 },
  { code: "WIN_RATE_60", name: "勝率60%以上", description: "10戦以上のうえで勝率60%以上を達成した。", conditionType: "WIN_RATE_MIN_10_MATCHES", conditionValue: 60, rewardPoints: 50 },
  { code: "TOP_LEAGUE_UNLOCKED", name: "上位リーグ解放", description: "ダイヤモンドリーグ以上を解放した。", conditionType: "LEAGUE_REACHED", conditionValue: 7000, rewardPoints: 60 },
  { code: "MIND_KING_REACHED", name: "MIND KING到達", description: "最高峰リーグ「MIND KING」に到達した。", conditionType: "LEAGUE_REACHED", conditionValue: 75000, rewardPoints: 300 },

  // 隠れ実績 — locked entries stay concealed on the catalog screen until unlocked.
  { code: "FLAWLESS_RECORD", name: "無敗の伝説", description: "10戦以上をこなし、勝率100%を保っている。", conditionType: "WIN_RATE_MIN_10_MATCHES", conditionValue: 100, rewardPoints: 150, hidden: true },
  { code: "WIN_STREAK_10", name: "常勝街道", description: "10連勝を達成した。", conditionType: "WIN_STREAK", conditionValue: 10, rewardPoints: 120, hidden: true },
  { code: "CHAMPION_5", name: "覇者の中の覇者", description: "トーナメントで5回優勝した。", conditionType: "TOURNAMENT_WINS", conditionValue: 5, rewardPoints: 150, hidden: true },
  { code: "TOURNAMENTS_50", name: "百戦錬磨", description: "50回のトーナメントに参加した。", conditionType: "TOURNAMENT_ENTRIES", conditionValue: 50, rewardPoints: 80, hidden: true },
  { code: "POINTS_100000", name: "頭脳の探求者", description: "累計100,000ポイントを獲得した。", conditionType: "LEAGUE_REACHED", conditionValue: 100000, rewardPoints: 500, hidden: true },
];
