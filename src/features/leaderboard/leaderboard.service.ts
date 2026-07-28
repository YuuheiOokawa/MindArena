import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { TITLES } from "@/config/titles";
import { AppError } from "@/lib/errors/app-error";
import type { League, PlayerProfile } from "@/generated/prisma/client";

const TOP_N = 50;

type RankedProfile = PlayerProfile & { currentLeague: League };

function toEntry(profile: RankedProfile, rank: number, viewerProfileId: string) {
  return {
    rank,
    playerProfileId: profile.id,
    displayName: profile.displayName,
    avatarIconId: profile.selectedAvatarIconId,
    customAvatarUrl: profile.customAvatarUrl,
    titleName: (TITLES.find((t) => t.id === profile.selectedTitleId) ?? TITLES[0]).name,
    totalPoints: profile.totalPoints,
    leagueDisplayName: profile.currentLeague.displayName,
    leagueThemeKey: profile.currentLeague.themeKey,
    isMe: profile.id === viewerProfileId,
  };
}

export type LeaderboardScope = "global" | "league";

/** Lightweight rank lookup for the home screen's "TOP X%" stat — skips the top-50 entries fetch
 * that getLeaderboard() does, since only the viewer's own standing is needed here. */
export async function getMyGlobalRank(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const [aboveCount, totalPlayers] = await Promise.all([
    playerProfileRepository.countAbovePoints(profile.totalPoints),
    playerProfileRepository.countAll(),
  ]);
  const rank = aboveCount + 1;
  const percentile = totalPlayers > 0 ? (rank / totalPlayers) * 100 : 100;

  return { rank, totalPlayers, percentile };
}

export async function getLeaderboard(userId: string, scope: LeaderboardScope) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");

  const leagueId = scope === "league" ? profile.currentLeagueId : undefined;

  const [top, aboveCount, totalPlayers] = await Promise.all([
    playerProfileRepository.listTopByPoints(TOP_N, leagueId),
    playerProfileRepository.countAbovePoints(profile.totalPoints, leagueId),
    playerProfileRepository.countAll(leagueId),
  ]);

  // Competition ranking (1, 2, 2, 4, ...) — a tie shares the rank of the first entry in the tie,
  // not its array position. Correct even though `top` is only a prefix of the full sorted set:
  // for a strictly points-desc-sorted list, the count of entries with MORE points than position i
  // is exactly i (0-indexed) whenever entries[i] starts a new points value, and ties inherit the
  // rank of the entry they're tied with.
  let rank = 0;
  const entries = top.map((p, i) => {
    if (i === 0 || p.totalPoints !== top[i - 1].totalPoints) rank = i + 1;
    return toEntry(p, rank, profile.id);
  });
  const myRank = aboveCount + 1;
  const inTop = entries.some((e) => e.isMe);

  return {
    scope,
    entries,
    totalPlayers,
    myRank,
    myEntry: inTop ? null : toEntry(profile, myRank, profile.id),
  };
}
