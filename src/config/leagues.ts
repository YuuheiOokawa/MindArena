import { BotDifficulty } from "@/domain/enums";

export interface LeagueConfig {
  code: string;
  name: string;
  displayName: string;
  description: string;
  requiredPoints: number;
  rewardMultiplier: number;
  botDifficulty: BotDifficulty;
  themeKey: string;
  frameKey: string;
  displayOrder: number;
  gameIds: string[];
}

const ALL_GAME_IDS = [
  "trust-or-betray",
  "number-bluff",
  "minority-choice",
  "final-prediction",
];

/**
 * The 10 tournament leagues. This is master data: renaming, re-pricing, or reordering a
 * league is a one-line change here (or, once seeded, a row edit) — no component hardcodes a
 * league name or threshold.
 */
export const LEAGUES: LeagueConfig[] = [
  {
    code: "BRONZE",
    name: "BRONZE",
    displayName: "ブロンズリーグ",
    description: "すべての挑戦者が最初に立つ舞台。読み合いの基礎を学べ。",
    requiredPoints: 0,
    rewardMultiplier: 1.0,
    botDifficulty: BotDifficulty.EASY,
    themeKey: "bronze",
    frameKey: "bronze",
    displayOrder: 1,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "SILVER",
    name: "SILVER",
    displayName: "シルバーリーグ",
    description: "駆け引きに慣れた者だけが辿り着く次の階層。",
    requiredPoints: 500,
    rewardMultiplier: 1.1,
    botDifficulty: BotDifficulty.EASY,
    themeKey: "silver",
    frameKey: "silver",
    displayOrder: 2,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "GOLD",
    name: "GOLD",
    displayName: "ゴールドリーグ",
    description: "確かな実績を持つプレイヤーが集う黄金の舞台。",
    requiredPoints: 1500,
    rewardMultiplier: 1.25,
    botDifficulty: BotDifficulty.NORMAL,
    themeKey: "gold",
    frameKey: "gold",
    displayOrder: 3,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "PLATINUM",
    name: "PLATINUM",
    displayName: "プラチナリーグ",
    description: "凡庸な読みは通用しない、洗練された頭脳戦の領域。",
    requiredPoints: 3500,
    rewardMultiplier: 1.4,
    botDifficulty: BotDifficulty.NORMAL,
    themeKey: "platinum",
    frameKey: "platinum",
    displayOrder: 4,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "DIAMOND",
    name: "DIAMOND",
    displayName: "ダイヤモンドリーグ",
    description: "研ぎ澄まされた観察眼を持つ者だけが生き残る。",
    requiredPoints: 7000,
    rewardMultiplier: 1.6,
    botDifficulty: BotDifficulty.HARD,
    themeKey: "diamond",
    frameKey: "diamond",
    displayOrder: 5,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "MASTER",
    name: "MASTER",
    displayName: "マスターリーグ",
    description: "熟練者たちの静かな戦場。一手のミスが命取りになる。",
    requiredPoints: 12000,
    rewardMultiplier: 1.8,
    botDifficulty: BotDifficulty.HARD,
    themeKey: "master",
    frameKey: "master",
    displayOrder: 6,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "GRAND_MASTER",
    name: "GRAND MASTER",
    displayName: "グランドマスターリーグ",
    description: "頂点に近い者だけが許される、極限の心理戦。",
    requiredPoints: 20000,
    rewardMultiplier: 2.0,
    botDifficulty: BotDifficulty.EXPERT,
    themeKey: "grand-master",
    frameKey: "grand-master",
    displayOrder: 7,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "EMPEROR",
    name: "EMPEROR",
    displayName: "エンペラーリーグ",
    description: "支配者の名にふさわしい者のみが名を連ねる。",
    requiredPoints: 32000,
    rewardMultiplier: 2.25,
    botDifficulty: BotDifficulty.EXPERT,
    themeKey: "emperor",
    frameKey: "emperor",
    displayOrder: 8,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "LEGEND",
    name: "LEGEND",
    displayName: "レジェンドリーグ",
    description: "伝説として語り継がれる勝率と実績を持つ者の領域。",
    requiredPoints: 50000,
    rewardMultiplier: 2.5,
    botDifficulty: BotDifficulty.MASTER,
    themeKey: "legend",
    frameKey: "legend",
    displayOrder: 9,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "MIND_KING",
    name: "MIND KING",
    displayName: "マインドキング",
    description: "MIND ARENA最高峰。誰の心も読み切る、盤上の王の座。",
    requiredPoints: 75000,
    rewardMultiplier: 3.0,
    botDifficulty: BotDifficulty.MASTER,
    themeKey: "mind-king",
    frameKey: "mind-king",
    displayOrder: 10,
    gameIds: ALL_GAME_IDS,
  },
  {
    code: "VOID",
    name: "VOID",
    displayName: "裏リーグ・ヴォイド",
    description:
      "王座の先に口を開く、語られざる領域。ここでの敗北は、深く沈む。",
    requiredPoints: 120000,
    rewardMultiplier: 4.0,
    botDifficulty: BotDifficulty.MASTER,
    themeKey: "void",
    frameKey: "mind-king",
    displayOrder: 11,
    gameIds: ALL_GAME_IDS,
  },
];

/** 裏リーグ: leagues that stay entirely invisible — league list, trophy case, lobby pickers —
 * until the player has EARNED the reveal by reaching the summit of the public ladder. Point
 * math (syncCurrentLeague, highest-league tracking) still sees them like any other league, so
 * crossing the threshold promotes into a VOID whose existence was, until then, a rumor. */
export const HIDDEN_LEAGUE_CODES = new Set<string>(["VOID"]);

/** Hidden leagues reveal themselves once the player reaches MIND KING (the last public league). */
export const HIDDEN_LEAGUE_REVEAL_POINTS = 75000;

export function isLeagueVisible(code: string, totalPoints: number): boolean {
  return (
    !HIDDEN_LEAGUE_CODES.has(code) || totalPoints >= HIDDEN_LEAGUE_REVEAL_POINTS
  );
}

export function getLeagueByCode(code: string): LeagueConfig | undefined {
  return LEAGUES.find((league) => league.code === code);
}
