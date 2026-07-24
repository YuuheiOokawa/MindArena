export interface TitleConfig {
  id: string;
  code: string;
  name: string;
  /** How this title is granted; read by the achievement/tournament finalization flow. */
  unlockHint: string;
}

export const TITLES: TitleConfig[] = [
  { id: "novice", code: "NOVICE", name: "駆け出しの挑戦者", unlockHint: "初期称号" },
  { id: "first-blood", code: "FIRST_BLOOD", name: "初陣の勝者", unlockHint: "初勝利" },
  { id: "streaker", code: "STREAKER", name: "連勝の使徒", unlockHint: "3連勝" },
  { id: "unbroken", code: "UNBROKEN", name: "不敗の意志", unlockHint: "5連勝" },
  { id: "finalist", code: "FINALIST", name: "決勝の舞台に立つ者", unlockHint: "初めての決勝進出" },
  { id: "champion", code: "CHAMPION", name: "頂点の証", unlockHint: "初優勝" },
  { id: "veteran", code: "VETERAN", name: "百戦の求道者", unlockHint: "トーナメント10回参加" },
  { id: "tactician", code: "TACTICIAN", name: "策略家", unlockHint: "勝率60%以上" },
  { id: "silver-tongue", code: "SILVER_TONGUE", name: "静寂の観察者", unlockHint: "全ゲームを1回ずつプレイ" },
  { id: "mind-king", code: "MIND_KING_TITLE", name: "MIND KING", unlockHint: "MIND KINGリーグ到達" },
];
