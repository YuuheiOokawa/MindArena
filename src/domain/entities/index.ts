// Plain TypeScript entity types mirroring the Prisma models. Kept independent of
// `@prisma/client`'s generated types so domain/services never import Prisma directly —
// repositories are responsible for mapping Prisma rows into these shapes.

import type {
  BotDifficulty,
  BotPersonality,
  GameSessionStatus,
  MatchStatus,
  ParticipantStatus,
  ParticipantType,
  PointReason,
  TournamentStatus,
} from "@/domain/enums";

export interface UserEntity {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface PlayerProfileEntity {
  id: string;
  userId: string;
  displayName: string;
  totalPoints: number;
  currentLeagueId: string;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  currentWinStreak: number;
  bestWinStreak: number;
  tournamentEntries: number;
  tournamentWins: number;
  finalsReached: number;
  selectedTitleId: string | null;
  selectedFrameId: string | null;
  showBotTag: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
  bgmEnabled: boolean;
  vibrationEnabled: boolean;
  timeoutPolicyOverride: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueEntity {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  requiredPoints: number;
  rewardMultiplier: number;
  championReward: number;
  runnerUpReward: number;
  topFourReward: number;
  participationReward: number;
  botDifficulty: BotDifficulty;
  themeKey: string;
  frameKey: string;
  displayOrder: number;
  isActive: boolean;
  gameIds: string[];
}

export interface TournamentEntity {
  id: string;
  leagueId: string;
  status: TournamentStatus;
  maxPlayers: number;
  currentRound: number;
  startedAt: Date | null;
  completedAt: Date | null;
  winnerParticipantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentParticipantEntity {
  id: string;
  tournamentId: string;
  playerId: string | null;
  botId: string | null;
  type: ParticipantType;
  displayName: string;
  seed: number;
  status: ParticipantStatus;
  eliminatedRound: number | null;
  finalPlacement: number | null;
}

export interface TournamentMatchEntity {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1ParticipantId: string | null;
  player2ParticipantId: string | null;
  winnerParticipantId: string | null;
  gameTypeId: string;
  status: MatchStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface GameTypeEntity {
  id: string;
  code: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  configuration: Record<string, unknown>;
  isActive: boolean;
}

export interface GameSessionEntity {
  id: string;
  tournamentMatchId: string;
  gameTypeId: string;
  status: GameSessionStatus;
  currentRound: number;
  state: Record<string, unknown>;
  startedAt: Date;
  completedAt: Date | null;
}

export interface MatchResultEntity {
  id: string;
  tournamentMatchId: string;
  winnerParticipantId: string | null;
  loserParticipantId: string | null;
  player1Score: number;
  player2Score: number;
  resultData: Record<string, unknown>;
  createdAt: Date;
}

export interface PointTransactionEntity {
  id: string;
  playerProfileId: string;
  amount: number;
  reason: PointReason;
  tournamentId: string | null;
  leagueId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface PlayerGameStatsEntity {
  id: string;
  playerProfileId: string;
  gameTypeId: string;
  matches: number;
  wins: number;
  losses: number;
  updatedAt: Date;
}

export interface BotProfileEntity {
  id: string;
  name: string;
  personality: BotPersonality;
  difficulty: BotDifficulty;
  judgment: number;
  deception: number;
  observation: number;
  riskTolerance: number;
  memory: number;
  randomness: number;
  avatarKey: string;
  isActive: boolean;
}

export interface AchievementEntity {
  id: string;
  code: string;
  name: string;
  description: string;
  conditionType: string;
  conditionValue: number;
  rewardData: Record<string, unknown>;
  isActive: boolean;
}

export interface PlayerAchievementEntity {
  id: string;
  playerProfileId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface CosmeticItemEntity {
  id: string;
  code: string;
  name: string;
  category: "FRAME" | "TITLE" | "BACKGROUND" | "BADGE";
  requiredPoints: number;
  assetKey: string;
  effectConfig: Record<string, unknown>;
  isActive: boolean;
}
