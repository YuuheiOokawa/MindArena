export interface EventMilestoneConfig {
  code: string;
  name: string;
  /** Win count during the event's active window required to make this claimable. */
  requiredScore: number;
  rewardPoints: number;
  rewardPrizeCurrency: number;
  sortOrder: number;
}

export interface EventConfig {
  code: string;
  name: string;
  description: string;
  /** Maps to a gradient/icon treatment on the event banner/detail screen (features/events UI) —
   * no real asset pipeline exists yet, same convention as League.themeKey. */
  themeKey: string;
  startAt: Date;
  endAt: Date;
  milestones: EventMilestoneConfig[];
}

/** 期間限定イベント — config-as-source-of-truth master data, upserted into the DB by
 * prisma/seed.ts (mirrors LEAGUES/ACHIEVEMENTS above). Score is a simple win count accumulated
 * during [startAt, endAt] (see features/tournaments/progress.service.ts's incrementEventProgress)
 * — deliberately NOT scaled by any per-event multiplier, so milestone thresholds read directly as
 * win-count goals. Rewards are claimed manually (features/events/event.service.ts's
 * claimEventMilestone), mirroring DAILY_MISSIONS rather than ACHIEVEMENTS' auto-grant. */
export const EVENTS: EventConfig[] = [
  {
    code: "SUMMER_FESTIVAL_2026",
    name: "真夏の心理戦フェスティバル",
    description: "期間中の勝利数に応じて豪華報酬がもらえる、夏の期間限定イベント。読み合いを制して上位を目指そう。",
    themeKey: "summer_festival",
    startAt: new Date("2026-07-25T00:00:00+09:00"),
    endAt: new Date("2026-08-17T23:59:59+09:00"),
    milestones: [
      {
        code: "WINS_3",
        name: "3勝達成",
        requiredScore: 3,
        rewardPoints: 100,
        rewardPrizeCurrency: 50,
        sortOrder: 1,
      },
      {
        code: "WINS_10",
        name: "10勝達成",
        requiredScore: 10,
        rewardPoints: 300,
        rewardPrizeCurrency: 150,
        sortOrder: 2,
      },
      {
        code: "WINS_25",
        name: "25勝達成",
        requiredScore: 25,
        rewardPoints: 800,
        rewardPrizeCurrency: 400,
        sortOrder: 3,
      },
      {
        code: "WINS_50",
        name: "50勝達成",
        requiredScore: 50,
        rewardPoints: 2000,
        rewardPrizeCurrency: 1000,
        sortOrder: 4,
      },
      {
        code: "WINS_100",
        name: "100勝達成",
        requiredScore: 100,
        rewardPoints: 5000,
        rewardPrizeCurrency: 2500,
        sortOrder: 5,
      },
    ],
  },
];
