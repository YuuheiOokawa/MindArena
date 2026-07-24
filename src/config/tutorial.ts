export interface TutorialSection {
  id: string;
  title: string;
  body: string[];
}

/**
 * Concept-level copy for the "how to play" screen and the post-registration tutorial step.
 * Per-game rules are NOT duplicated here — see `GAME_CATALOG` in `config/games.ts`, which this
 * screen renders alongside these sections so game rules stay defined in exactly one place.
 */
export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: "concept",
    title: "MIND ARENAとは",
    body: [
      "相手の考えを読み、嘘・駆け引き・選択・予測を駆使して戦う1対1の心理戦ゲームです。",
      "32人が参加するトーナメントに挑戦し、勝ち上がって頂点（チャンピオン）を目指します。",
    ],
  },
  {
    id: "tournament",
    title: "トーナメントの流れ",
    body: [
      "参加すると、残りの枠はBOTで自動的に埋まり、すぐに32人トーナメントが始まります。",
      "1回戦・2回戦・準々決勝・準決勝・決勝の全5ラウンド、負けたらその場で敗退のシングルエリミネーション方式です。",
      "各試合ごとに、4つの心理戦ゲームの中からランダムで1つが選ばれます。対戦前の画面でルールを確認できます。",
    ],
  },
  {
    id: "points",
    title: "ポイントとリーグ",
    body: [
      "対戦に勝ち進むほど多くのポイントを獲得できます。",
      "貯めたポイントに応じて所属リーグが上がり、上位リーグほど手強いBOTと対戦することになります。",
    ],
  },
];
