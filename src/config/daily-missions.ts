export type DailyMissionConditionType = "LOGIN_BONUS_CLAIMED" | "MATCHES_PLAYED" | "MATCHES_WON";

export interface DailyMissionConfig {
  code: string;
  name: string;
  description: string;
  conditionType: DailyMissionConditionType;
  target: number;
  rewardPoints: number;
  rewardPrizeCurrency: number;
}

/** 今日のミッション — resets every JST calendar day (progress is derived from PlayerProfile's
 * lazy-reset daily counters, see domain/services/daily-mission.service.ts). */
export const DAILY_MISSIONS: DailyMissionConfig[] = [
  {
    code: "CLAIM_LOGIN_BONUS",
    name: "ログインボーナスを受け取る",
    description: "本日のログインボーナスを受け取ろう。",
    conditionType: "LOGIN_BONUS_CLAIMED",
    target: 1,
    rewardPoints: 10,
    rewardPrizeCurrency: 0,
  },
  {
    code: "PLAY_ONE_MATCH",
    name: "対戦を1回行う",
    description: "心理戦に1回挑戦しよう。",
    conditionType: "MATCHES_PLAYED",
    target: 1,
    rewardPoints: 15,
    rewardPrizeCurrency: 0,
  },
  {
    code: "WIN_ONE_MATCH",
    name: "対戦に1回勝利する",
    description: "対戦で1勝を挙げよう。",
    conditionType: "MATCHES_WON",
    target: 1,
    rewardPoints: 25,
    rewardPrizeCurrency: 30,
  },
];
