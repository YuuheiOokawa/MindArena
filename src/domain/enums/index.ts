// Enums shared by domain, Prisma, and UI layers. Kept string-valued so they read cleanly
// out of Prisma, JSON columns, and API payloads without a numeric mapping table.

export enum TournamentStatus {
  RECRUITING = "RECRUITING",
  READY = "READY",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum MatchStatus {
  WAITING = "WAITING",
  READY = "READY",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ParticipantType {
  HUMAN = "HUMAN",
  BOT = "BOT",
}

export enum ParticipantStatus {
  ACTIVE = "ACTIVE",
  ELIMINATED = "ELIMINATED",
  BYE = "BYE",
  WITHDRAWN = "WITHDRAWN",
}

export enum GameSessionStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  ABANDONED = "ABANDONED",
}

export enum BotDifficulty {
  EASY = "EASY",
  NORMAL = "NORMAL",
  HARD = "HARD",
  EXPERT = "EXPERT",
  MASTER = "MASTER",
}

export enum BotPersonality {
  RANDOM = "RANDOM",
  CAUTIOUS = "CAUTIOUS",
  AGGRESSIVE = "AGGRESSIVE",
  BETRAYER = "BETRAYER",
  PATTERN = "PATTERN",
  ANALYST = "ANALYST",
}

export enum PointReason {
  TOURNAMENT_ENTRY = "TOURNAMENT_ENTRY",
  ROUND_1_CLEAR = "ROUND_1_CLEAR",
  ROUND_2_CLEAR = "ROUND_2_CLEAR",
  QUARTERFINAL_CLEAR = "QUARTERFINAL_CLEAR",
  SEMIFINAL_CLEAR = "SEMIFINAL_CLEAR",
  RUNNER_UP = "RUNNER_UP",
  CHAMPION = "CHAMPION",
  /** Eliminated in round 1 (1回戦敗退, "ベスト32" finish) — the earliest, most heavily penalized exit. */
  ROUND_1_ELIMINATION = "ROUND_1_ELIMINATION",
  /** Eliminated in round 2 ("ベスト16" finish). */
  ROUND_2_ELIMINATION = "ROUND_2_ELIMINATION",
  /** Eliminated in round 3 / the quarterfinal ("ベスト8" finish). Round 4 (semifinal) losers
   * finish "ベスト4" and are deliberately NOT penalized — see config/round-rewards.ts. */
  QUARTERFINAL_ELIMINATION = "QUARTERFINAL_ELIMINATION",
  ACHIEVEMENT_BONUS = "ACHIEVEMENT_BONUS",
  DAILY_BONUS = "DAILY_BONUS",
  ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT",
}

export const POINT_REASON_LABEL: Record<PointReason, string> = {
  [PointReason.TOURNAMENT_ENTRY]: "トーナメント参加",
  [PointReason.ROUND_1_CLEAR]: "1回戦突破",
  [PointReason.ROUND_2_CLEAR]: "2回戦突破",
  [PointReason.QUARTERFINAL_CLEAR]: "準々決勝突破",
  [PointReason.SEMIFINAL_CLEAR]: "準決勝突破",
  [PointReason.RUNNER_UP]: "準優勝",
  [PointReason.CHAMPION]: "優勝",
  [PointReason.ROUND_1_ELIMINATION]: "1回戦敗退",
  [PointReason.ROUND_2_ELIMINATION]: "2回戦敗退",
  [PointReason.QUARTERFINAL_ELIMINATION]: "準々決勝敗退",
  [PointReason.ACHIEVEMENT_BONUS]: "実績報酬",
  [PointReason.DAILY_BONUS]: "デイリーボーナス",
  [PointReason.ADMIN_ADJUSTMENT]: "運営による調整",
};

export enum TimeoutPolicy {
  RANDOM_ACTION = "RANDOM_ACTION",
  FORFEIT_ROUND = "FORFEIT_ROUND",
}

export enum FriendshipStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
}

export enum FriendChallengeStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export enum TournamentInviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED",
}

export enum TournamentRound {
  ROUND_OF_32 = 1,
  ROUND_OF_16 = 2,
  QUARTERFINAL = 3,
  SEMIFINAL = 4,
  FINAL = 5,
}

export const TOURNAMENT_ROUND_LABEL: Record<TournamentRound, string> = {
  [TournamentRound.ROUND_OF_32]: "Round of 32",
  [TournamentRound.ROUND_OF_16]: "Round of 16",
  [TournamentRound.QUARTERFINAL]: "Quarterfinal",
  [TournamentRound.SEMIFINAL]: "Semifinal",
  [TournamentRound.FINAL]: "Final",
};

export const POINT_REASON_TO_ROUND: Partial<Record<PointReason, TournamentRound>> = {
  [PointReason.ROUND_1_CLEAR]: TournamentRound.ROUND_OF_32,
  [PointReason.ROUND_2_CLEAR]: TournamentRound.ROUND_OF_16,
  [PointReason.QUARTERFINAL_CLEAR]: TournamentRound.QUARTERFINAL,
  [PointReason.SEMIFINAL_CLEAR]: TournamentRound.SEMIFINAL,
  [PointReason.ROUND_1_ELIMINATION]: TournamentRound.ROUND_OF_32,
  [PointReason.ROUND_2_ELIMINATION]: TournamentRound.ROUND_OF_16,
  [PointReason.QUARTERFINAL_ELIMINATION]: TournamentRound.QUARTERFINAL,
};
