import { BotDifficulty, BotPersonality } from "@/domain/enums";

export interface StatRange {
  min: number;
  max: number;
}

export interface DifficultyBand {
  difficulty: BotDifficulty;
  stats: StatRange;
  /** Probability [0,1] a bot deviates from its "optimal" action on any given decision. */
  mistakeRate: number;
}

/** Higher leagues field bots sampled from tougher bands — see League.botDifficulty in config/leagues.ts. */
export const BOT_DIFFICULTY_BANDS: DifficultyBand[] = [
  {
    difficulty: BotDifficulty.EASY,
    stats: { min: 10, max: 35 },
    mistakeRate: 0.35,
  },
  {
    difficulty: BotDifficulty.NORMAL,
    stats: { min: 30, max: 55 },
    mistakeRate: 0.22,
  },
  {
    difficulty: BotDifficulty.HARD,
    stats: { min: 50, max: 70 },
    mistakeRate: 0.13,
  },
  {
    difficulty: BotDifficulty.EXPERT,
    stats: { min: 65, max: 85 },
    mistakeRate: 0.07,
  },
  {
    difficulty: BotDifficulty.MASTER,
    stats: { min: 80, max: 99 },
    mistakeRate: 0.03,
  },
];

export function getDifficultyBand(difficulty: BotDifficulty): DifficultyBand {
  const band = BOT_DIFFICULTY_BANDS.find((b) => b.difficulty === difficulty);
  if (!band) throw new Error(`Unknown bot difficulty: ${difficulty}`);
  return band;
}

export function getBotPersonalityMeta(
  personality: string,
): { label: string; description: string } | null {
  return BOT_PERSONALITIES.find((p) => p.id === personality) ?? null;
}

export const BOT_PERSONALITIES: {
  id: BotPersonality;
  label: string;
  description: string;
}[] = [
  {
    id: BotPersonality.RANDOM,
    label: "ランダム型",
    description: "行動を予測しづらい、気まぐれなタイプ。",
  },
  {
    id: BotPersonality.CAUTIOUS,
    label: "慎重型",
    description: "安全な選択を好み、大きなリスクを避ける。",
  },
  {
    id: BotPersonality.AGGRESSIVE,
    label: "攻撃型",
    description: "高リターンな選択を好み、積極的に仕掛ける。",
  },
  {
    id: BotPersonality.BETRAYER,
    label: "裏切り型",
    description: "裏切り・ブラフ寄りの選択に偏る。",
  },
  {
    id: BotPersonality.PATTERN,
    label: "パターン型",
    description: "一定のパターンで動く。読まれると弱い。",
  },
  {
    id: BotPersonality.ANALYST,
    label: "相手分析型",
    description: "相手の過去の行動を分析して選択する。",
  },
];
