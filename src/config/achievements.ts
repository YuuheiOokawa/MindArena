export type AchievementConditionType =
  | "TOTAL_MATCHES"
  | "TOTAL_WINS"
  | "WIN_STREAK"
  | "FINALS_REACHED"
  | "TOURNAMENT_WINS"
  | "TOURNAMENT_ENTRIES"
  | "ALL_GAMES_PLAYED"
  | "WIN_RATE_MIN_10_MATCHES"
  | "LEAGUE_REACHED"
  /** profile.loginBonusStreak (config/daily-bonus.ts's 1-7 cycling counter) — caps at 7, so
   * conditionValue must be <= 7. */
  | "LOGIN_STREAK"
  /** profile.lifetimePrizeCurrency — cumulative prize money ever earned, never decremented by
   * shop purchases. */
  | "LIFETIME_PRIZE_EARNED";

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
  // 対戦回数
  {
    code: "FIRST_MATCH",
    name: "初めての対戦",
    description: "はじめて心理戦をプレイした。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 1,
    rewardPoints: 10,
  },
  {
    code: "MATCHES_25",
    name: "駆け出しの戦歴",
    description: "累計25戦を経験した。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 25,
    rewardPoints: 20,
  },
  {
    code: "MATCHES_50",
    name: "歴戦の証",
    description: "累計50戦を経験した。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 50,
    rewardPoints: 30,
  },
  {
    code: "MATCHES_100",
    name: "百戦の勇者",
    description: "累計100戦を経験した。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 100,
    rewardPoints: 50,
  },
  {
    code: "MATCHES_250",
    name: "闘いに生きる者",
    description: "累計250戦を経験した。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 250,
    rewardPoints: 100,
  },

  // 勝利数
  {
    code: "FIRST_WIN",
    name: "初勝利",
    description: "はじめて対戦に勝利した。",
    conditionType: "TOTAL_WINS",
    conditionValue: 1,
    rewardPoints: 20,
  },
  {
    code: "WINS_10",
    name: "10勝達成",
    description: "通算10勝を達成した。",
    conditionType: "TOTAL_WINS",
    conditionValue: 10,
    rewardPoints: 40,
  },
  {
    code: "WINS_25",
    name: "勝利の積み重ね",
    description: "通算25勝を達成した。",
    conditionType: "TOTAL_WINS",
    conditionValue: 25,
    rewardPoints: 60,
  },
  {
    code: "WINS_50",
    name: "常勝への道",
    description: "通算50勝を達成した。",
    conditionType: "TOTAL_WINS",
    conditionValue: 50,
    rewardPoints: 90,
  },

  // 連勝記録
  {
    code: "WIN_STREAK_3",
    name: "3連勝",
    description: "3連勝を達成した。",
    conditionType: "WIN_STREAK",
    conditionValue: 3,
    rewardPoints: 30,
  },
  {
    code: "WIN_STREAK_5",
    name: "5連勝",
    description: "5連勝を達成した。",
    conditionType: "WIN_STREAK",
    conditionValue: 5,
    rewardPoints: 50,
  },
  {
    code: "WIN_STREAK_7",
    name: "7連勝",
    description: "7連勝を達成した。",
    conditionType: "WIN_STREAK",
    conditionValue: 7,
    rewardPoints: 70,
  },

  // 決勝・優勝
  {
    code: "FIRST_FINAL",
    name: "初めての決勝進出",
    description: "はじめて決勝に進出した。",
    conditionType: "FINALS_REACHED",
    conditionValue: 1,
    rewardPoints: 60,
  },
  {
    code: "FINALS_5",
    name: "決勝の常連",
    description: "5回、決勝の舞台に立った。",
    conditionType: "FINALS_REACHED",
    conditionValue: 5,
    rewardPoints: 90,
  },
  {
    code: "FIRST_CHAMPION",
    name: "初優勝",
    description: "はじめてトーナメントで優勝した。",
    conditionType: "TOURNAMENT_WINS",
    conditionValue: 1,
    rewardPoints: 100,
  },
  {
    code: "CHAMPION_3",
    name: "三冠達成",
    description: "トーナメントで3回優勝した。",
    conditionType: "TOURNAMENT_WINS",
    conditionValue: 3,
    rewardPoints: 130,
  },

  // トーナメント参加
  {
    code: "TOURNAMENTS_5",
    name: "常連への一歩",
    description: "5回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 5,
    rewardPoints: 25,
  },
  {
    code: "TOURNAMENTS_10",
    name: "トーナメント10回参加",
    description: "10回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 10,
    rewardPoints: 40,
  },
  {
    code: "TOURNAMENTS_25",
    name: "挑戦を止めない者",
    description: "25回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 25,
    rewardPoints: 50,
  },

  // 決勝の常連(可視・追加分)
  {
    code: "FINALS_3",
    name: "決勝を知る者",
    description: "3回、決勝の舞台に立った。",
    conditionType: "FINALS_REACHED",
    conditionValue: 3,
    rewardPoints: 70,
  },

  // ゲームマスタリー
  {
    code: "ALL_GAMES",
    name: "全ゲームを1回ずつプレイ",
    description: "4種類すべての心理戦をプレイした。",
    conditionType: "ALL_GAMES_PLAYED",
    conditionValue: 4,
    rewardPoints: 30,
  },

  // 勝率
  {
    code: "WIN_RATE_60",
    name: "勝率60%以上",
    description: "10戦以上のうえで勝率60%以上を達成した。",
    conditionType: "WIN_RATE_MIN_10_MATCHES",
    conditionValue: 60,
    rewardPoints: 50,
  },
  {
    code: "WIN_RATE_70",
    name: "堅実なる読み手",
    description: "10戦以上のうえで勝率70%以上を達成した。",
    conditionType: "WIN_RATE_MIN_10_MATCHES",
    conditionValue: 70,
    rewardPoints: 70,
  },

  // リーグ到達(各リーグ1つずつ)
  {
    code: "LEAGUE_SILVER",
    name: "シルバー到達",
    description: "シルバーリーグに到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 500,
    rewardPoints: 15,
  },
  {
    code: "LEAGUE_GOLD",
    name: "ゴールド到達",
    description: "ゴールドリーグに到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 1500,
    rewardPoints: 25,
  },
  {
    code: "LEAGUE_PLATINUM",
    name: "プラチナ到達",
    description: "プラチナリーグに到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 3500,
    rewardPoints: 35,
  },
  {
    code: "TOP_LEAGUE_UNLOCKED",
    name: "上位リーグ解放",
    description: "ダイヤモンドリーグ以上を解放した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 7000,
    rewardPoints: 60,
  },
  {
    code: "LEAGUE_MASTER",
    name: "マスター到達",
    description: "マスターリーグに到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 12000,
    rewardPoints: 80,
  },
  {
    code: "LEAGUE_GRAND_MASTER",
    name: "グランドマスター到達",
    description: "グランドマスターリーグに到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 20000,
    rewardPoints: 120,
  },
  {
    code: "MIND_KING_REACHED",
    name: "MIND KING到達",
    description: "最高峰リーグ「MIND KING」に到達した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 75000,
    rewardPoints: 300,
  },

  // ログインボーナス
  {
    code: "LOGIN_STREAK_3",
    name: "3日連続ログイン",
    description: "3日連続でログインボーナスを受け取った。",
    conditionType: "LOGIN_STREAK",
    conditionValue: 3,
    rewardPoints: 15,
  },
  {
    code: "LOGIN_STREAK_5",
    name: "5日連続ログイン",
    description: "5日連続でログインボーナスを受け取った。",
    conditionType: "LOGIN_STREAK",
    conditionValue: 5,
    rewardPoints: 30,
  },

  // 賞金
  {
    code: "PRIZE_1000",
    name: "駆け出しの稼ぎ",
    description: "生涯獲得賞金が1,000に到達した。",
    conditionType: "LIFETIME_PRIZE_EARNED",
    conditionValue: 1000,
    rewardPoints: 20,
  },
  {
    code: "PRIZE_5000",
    name: "堅実な蓄え",
    description: "生涯獲得賞金が5,000に到達した。",
    conditionType: "LIFETIME_PRIZE_EARNED",
    conditionValue: 5000,
    rewardPoints: 40,
  },
  {
    code: "PRIZE_10000",
    name: "賞金稼ぎ",
    description: "生涯獲得賞金が10,000に到達した。",
    conditionType: "LIFETIME_PRIZE_EARNED",
    conditionValue: 10000,
    rewardPoints: 60,
  },

  // 隠れ実績 — locked entries stay concealed on the catalog screen until unlocked.
  {
    code: "FLAWLESS_RECORD",
    name: "無敗の伝説",
    description: "10戦以上をこなし、勝率100%を保っている。",
    conditionType: "WIN_RATE_MIN_10_MATCHES",
    conditionValue: 100,
    rewardPoints: 150,
    hidden: true,
  },
  {
    code: "MATCHES_500",
    name: "戦いの求道者",
    description: "累計500戦を経験した、もはや生粋の挑戦者だ。",
    conditionType: "TOTAL_MATCHES",
    conditionValue: 500,
    rewardPoints: 200,
    hidden: true,
  },
  {
    code: "WINS_100",
    name: "百勝の証",
    description: "通算100勝という金字塔を打ち立てた。",
    conditionType: "TOTAL_WINS",
    conditionValue: 100,
    rewardPoints: 250,
    hidden: true,
  },
  {
    code: "WIN_STREAK_10",
    name: "常勝街道",
    description: "10連勝を達成した。",
    conditionType: "WIN_STREAK",
    conditionValue: 10,
    rewardPoints: 120,
    hidden: true,
  },
  {
    code: "WIN_STREAK_15",
    name: "止まらぬ快進撃",
    description: "15連勝という驚異的な記録を打ち立てた。",
    conditionType: "WIN_STREAK",
    conditionValue: 15,
    rewardPoints: 220,
    hidden: true,
  },
  {
    code: "FINALS_10",
    name: "決勝の顔",
    description: "10回、決勝の舞台に立った。",
    conditionType: "FINALS_REACHED",
    conditionValue: 10,
    rewardPoints: 160,
    hidden: true,
  },
  {
    code: "CHAMPION_5",
    name: "覇者の中の覇者",
    description: "トーナメントで5回優勝した。",
    conditionType: "TOURNAMENT_WINS",
    conditionValue: 5,
    rewardPoints: 150,
    hidden: true,
  },
  {
    code: "CHAMPION_10",
    name: "覇道を極めし者",
    description: "トーナメントで10回優勝した。",
    conditionType: "TOURNAMENT_WINS",
    conditionValue: 10,
    rewardPoints: 320,
    hidden: true,
  },
  {
    code: "TOURNAMENTS_50",
    name: "百戦錬磨",
    description: "50回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 50,
    rewardPoints: 80,
    hidden: true,
  },
  {
    code: "TOURNAMENTS_100",
    name: "闘技場の主",
    description: "100回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 100,
    rewardPoints: 180,
    hidden: true,
  },
  {
    code: "WIN_RATE_80",
    name: "見切り抜く眼",
    description: "10戦以上のうえで勝率80%以上を達成した。",
    conditionType: "WIN_RATE_MIN_10_MATCHES",
    conditionValue: 80,
    rewardPoints: 140,
    hidden: true,
  },
  {
    code: "LEAGUE_EMPEROR",
    name: "エンペラー到達",
    description: "エンペラーリーグに到達した、支配者の風格だ。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 32000,
    rewardPoints: 180,
    hidden: true,
  },
  {
    code: "LEAGUE_LEGEND",
    name: "レジェンド到達",
    description: "レジェンドリーグに到達した、もはや語り草だ。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 50000,
    rewardPoints: 250,
    hidden: true,
  },
  {
    code: "POINTS_100000",
    name: "頭脳の探求者",
    description: "累計100,000ポイントを獲得した。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 100000,
    rewardPoints: 500,
    hidden: true,
  },
  {
    code: "LOGIN_STREAK_7",
    name: "皆勤の一週間",
    description: "7日連続でログインボーナスを受け取った。",
    conditionType: "LOGIN_STREAK",
    conditionValue: 7,
    rewardPoints: 60,
    hidden: true,
  },
  {
    code: "PRIZE_50000",
    name: "賞金王への道",
    description: "生涯獲得賞金が50,000に到達した。",
    conditionType: "LIFETIME_PRIZE_EARNED",
    conditionValue: 50000,
    rewardPoints: 200,
    hidden: true,
  },
  {
    code: "PRIZE_100000",
    name: "黄金の玉座",
    description: "生涯獲得賞金が100,000に到達した。",
    conditionType: "LIFETIME_PRIZE_EARNED",
    conditionValue: 100000,
    rewardPoints: 400,
    hidden: true,
  },
  {
    code: "WINS_200",
    name: "二百勝の重み",
    description: "通算200勝に到達した。",
    conditionType: "TOTAL_WINS",
    conditionValue: 200,
    rewardPoints: 400,
    hidden: true,
  },
  {
    code: "WINS_500",
    name: "五百勝の伝説",
    description: "通算500勝。その名はもう伝説として語られている。",
    conditionType: "TOTAL_WINS",
    conditionValue: 500,
    rewardPoints: 700,
    hidden: true,
  },
  {
    code: "WIN_STREAK_20",
    name: "無双の刻",
    description: "20連勝。誰もあなたの心を読めなかった。",
    conditionType: "WIN_STREAK",
    conditionValue: 20,
    rewardPoints: 400,
    hidden: true,
  },
  {
    code: "WIN_RATE_90",
    name: "心を読む者",
    description: "10戦以上のうえで勝率90%以上を達成した。",
    conditionType: "WIN_RATE_MIN_10_MATCHES",
    conditionValue: 90,
    rewardPoints: 300,
    hidden: true,
  },
  {
    code: "FINALS_25",
    name: "決勝の支配者",
    description: "25回、決勝の舞台に立った。",
    conditionType: "FINALS_REACHED",
    conditionValue: 25,
    rewardPoints: 300,
    hidden: true,
  },
  {
    code: "CHAMPION_25",
    name: "永劫の王",
    description: "トーナメントで25回優勝した。",
    conditionType: "TOURNAMENT_WINS",
    conditionValue: 25,
    rewardPoints: 600,
    hidden: true,
  },
  {
    code: "TOURNAMENTS_200",
    name: "闘技場そのもの",
    description: "200回のトーナメントに参加した。",
    conditionType: "TOURNAMENT_ENTRIES",
    conditionValue: 200,
    rewardPoints: 350,
    hidden: true,
  },
  {
    code: "VOID_REACHED",
    name: "裏の扉",
    description: "語られざる領域「裏リーグ・ヴォイド」に足を踏み入れた。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 120000,
    rewardPoints: 800,
    hidden: true,
  },
  {
    code: "POINTS_200000",
    name: "限界の先へ",
    description: "累計200,000ポイントに到達した。ヴォイドの底すら見えない。",
    conditionType: "LEAGUE_REACHED",
    conditionValue: 200000,
    rewardPoints: 1000,
    hidden: true,
  },
];
