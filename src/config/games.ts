export interface GameMeta {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  rules: string[];
  minPlayers: number;
  maxPlayers: number;
  totalRounds: number;
}

/**
 * Display/master metadata for the 4 games. Game *logic* lives in features/games/<slug>;
 * this is only what screens need to render names/rules without importing game internals.
 */
export const GAME_CATALOG: GameMeta[] = [
  {
    id: "trust-or-betray",
    code: "TRUST_OR_BETRAY",
    name: "TRUST OR BETRAY",
    tagline: "信じるか、裏切るか。",
    description:
      "自分の意図を宣言しつつ「信頼」か「裏切り」を選び、3ラウンドの合計点で勝敗を決める心理戦。",
    rules: [
      "まず「信頼」か「裏切り」のどちらを選ぶか「宣言」する（相手にも見える。本当でも嘘でもよい）",
      "相手の宣言を見たうえで、最終的な選択を「ロックイン」する（宣言と違う選択でもよい）",
      "信頼×信頼は両者+1点",
      "信頼×裏切りは裏切った側が+2点、信頼した側は0点",
      "裏切り×裏切りは両者-1点",
      "3ラウンドの合計点が高い方の勝ち",
    ],
    minPlayers: 2,
    maxPlayers: 2,
    totalRounds: 3,
  },
  {
    id: "number-bluff",
    code: "NUMBER_BLUFF",
    name: "NUMBER BLUFF",
    tagline: "数字は嘘をつく。",
    description:
      "1〜9の数字を選び、宣言の真偽を読み合う3ラウンドのブラフ勝負。",
    rules: [
      "1〜9から数字を1つ選ぶ",
      "定型文から宣言を1つ選ぶ（本当でも嘘でもよい）",
      "相手の宣言を「信じる」か「疑う」かを選ぶ",
      "見抜き・騙しの結果に応じて得点が入る",
      "3ラウンドの合計点で勝敗を決める",
    ],
    minPlayers: 2,
    maxPlayers: 2,
    totalRounds: 3,
  },
  {
    id: "minority-choice",
    code: "MINORITY_CHOICE",
    name: "MINORITY CHOICE",
    tagline: "少数派に立て。",
    description:
      "公開された観客票を数え、相手の出方を読んでAかBの少数派を選び続ける3ラウンドの心理戦。",
    rules: [
      "毎ラウンド、観客21票のうち17票の内訳が事前に公開される（残り4票は非公開）",
      "公開票を見たうえで、AかBのどちらを選ぶか「宣言」する（相手にも見える。本当でも嘘でもよい）",
      "相手の宣言を見たうえで、最終的な選択を「ロックイン」する（宣言と違う選択でもよい）",
      "観客票＋自分と相手の1票ずつを合計し、少数派の側を選んだ者だけが得点する",
      "公開票の差が小さいラウンドほど、相手の1票と非公開票が勝敗を分ける",
      "3ラウンドの合計点で勝敗を決める",
    ],
    minPlayers: 2,
    maxPlayers: 2,
    totalRounds: 3,
  },
  {
    id: "final-prediction",
    code: "FINAL_PREDICTION",
    name: "FINAL PREDICTION",
    tagline: "その一手を読み切れ。",
    description:
      "「攻撃」「防御」「見破る」の三すくみを5ラウンド、宣言と読み合いで相手を出し抜く。",
    rules: [
      "まず「攻撃」「防御」「見破る」のどれを出すか「宣言」する（相手にも見える。本当でも嘘でもよい）",
      "相手の宣言を見たうえで、最終的に出す手を「ロックイン」する（宣言と違う手でもよい）",
      "攻撃は見破るに勝ち、見破るは防御に勝ち、防御は攻撃に勝つ",
      "5ラウンドの合計点で勝敗を決める",
    ],
    minPlayers: 2,
    maxPlayers: 2,
    totalRounds: 5,
  },
];

export function getGameMeta(gameId: string): GameMeta | undefined {
  return GAME_CATALOG.find((game) => game.id === gameId);
}
