import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getMyProfile } from "@/features/profiles/profile.service";
import { getMyMatchHistory } from "@/features/profiles/match-history.service";
import { resolveResumeState } from "@/features/tournaments/resume";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { listIncomingChallenges } from "@/features/friends/challenge.service";
import { listIncomingTournamentInvites } from "@/features/tournaments/invite.service";
import { getMyGlobalRank } from "@/features/leaderboard/leaderboard.service";
import { AppScreen } from "@/components/layout/app-screen";
import { EmptyState } from "@/components/common/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  Bot,
  Calendar,
  Coins,
  Crown,
  Flame,
  Mail,
  Megaphone,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { resumeHref } from "@/features/tournaments/resume-href";
import { APP_CONFIG } from "@/config/app";
import { PlayerAvatar } from "@/components/common/player-avatar";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { DailyBonusCard } from "@/components/home/daily-bonus-card";
import { DailyMissionsCard } from "@/components/home/daily-missions-card";
import { RainbowLuxuryFrame } from "@/components/common/rainbow-luxury";
import { ANNOUNCEMENTS } from "@/config/announcements";
import { TITLES } from "@/config/titles";
import { getLeagueLuxury } from "@/config/league-visuals";
import { cn } from "@/lib/utils/cn";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [
    profile,
    recent,
    resume,
    incomingFriendRequests,
    incomingChallenges,
    incomingTournamentInvites,
    rank,
  ] = await Promise.all([
    getMyProfile(session.user.id),
    getMyMatchHistory(session.user.id, undefined, 3),
    resolveResumeState(session.user.id),
    listIncomingFriendRequests(session.user.id),
    listIncomingChallenges(session.user.id),
    listIncomingTournamentInvites(session.user.id),
    getMyGlobalRank(session.user.id),
  ]);

  // "champion" is a one-time celebration screen reached right after the winning match, not a
  // place to route back into from Home — once seen, Home should offer a fresh tournament again.
  const inTournament = resume.screen !== "home" && resume.screen !== "champion";

  const title =
    TITLES.find((t) => t.id === profile.selectedTitleId) ?? TITLES[0];
  const luxury = getLeagueLuxury(profile.league.current.themeKey);
  const highestLeague = profile.highestLeague ?? {
    displayName: profile.league.current.displayName,
    themeKey: profile.league.current.themeKey,
    reachedAt: null,
  };
  const isBestStreak =
    profile.bestWinStreak > 0 &&
    profile.currentWinStreak === profile.bestWinStreak;
  const luxuryStyle = {
    ...(luxury.level >= 2 && !luxury.rainbow
      ? { boxShadow: `0 0 24px -12px ${luxury.glowColor}` }
      : {}),
    ...(luxury.level >= 3 && !luxury.rainbow
      ? { "--arena-glow-color": luxury.glowColor }
      : {}),
    ...(luxury.level >= 4 && !luxury.rainbow
      ? { "--arena-shimmer-color": luxury.glowColor }
      : {}),
  } as React.CSSProperties;

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-arena-primary/40 bg-arena-primary/15">
              <span className="text-xs font-bold text-arena-primary-soft">
                M
              </span>
            </div>
            <span className="text-sm font-bold tracking-wide text-arena-white">
              {APP_CONFIG.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="#announcements"
              className="flex h-9 w-9 items-center justify-center rounded-full text-arena-silver/80 hover:text-arena-white"
            >
              <Bell className="h-4 w-4" />
            </a>
            <Link
              href="/friends"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-arena-silver/80 hover:text-arena-white"
            >
              <Mail className="h-4 w-4" />
              {(incomingFriendRequests.length > 0 ||
                incomingChallenges.length > 0 ||
                incomingTournamentInvites.length > 0) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-arena-danger" />
              )}
            </Link>
          </div>
        </header>

        <RainbowLuxuryFrame active={!!luxury.rainbow} rounded="rounded-2xl">
          <Card
            className={cn(
              "relative overflow-hidden",
              luxury.rainbow
                ? "border-0 bg-arena-surface/95"
                : cn(
                    "border-2 bg-gradient-to-b to-transparent",
                    luxury.border,
                    luxury.headerGradient,
                  ),
              !luxury.rainbow && luxury.level >= 3 && "arena-glow-pulse",
              !luxury.rainbow && luxury.level >= 4 && "arena-shimmer",
            )}
            style={luxuryStyle}
          >
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  {luxury.level >= 4 && (
                    <Crown className="absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 text-arena-gold drop-shadow-[0_0_4px_rgba(224,178,86,0.8)]" />
                  )}
                  <RainbowLuxuryFrame
                    active={!!luxury.rainbow}
                    rounded="rounded-full"
                    halo={false}
                  >
                    <PlayerAvatar
                      displayName={profile.displayName}
                      avatarIconId={profile.selectedAvatarIconId}
                      photoUrl={profile.customAvatarUrl}
                      className={cn(
                        "h-14 w-14 text-lg",
                        luxury.rainbow
                          ? "border-transparent"
                          : luxury.avatarBorder,
                      )}
                    />
                  </RainbowLuxuryFrame>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-arena-white">
                    {profile.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge className={cn("gap-1", luxury.badgeClass)}>
                      {luxury.level >= 4 && <Crown className="h-3 w-3" />}
                      <LeagueBadgeIcon
                        themeKey={profile.league.current.themeKey}
                      />
                      {profile.league.current.displayName}
                    </Badge>
                    <Badge variant="gold">{title.name}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-arena-silver/70">
                    <span>
                      勝率{" "}
                      <span className="font-semibold text-arena-white">
                        {profile.winRate}%
                      </span>
                    </span>
                    <span className="text-arena-border">|</span>
                    <span>
                      総対戦数{" "}
                      <span className="font-semibold text-arena-white">
                        {profile.totalMatches}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="flex items-center justify-end gap-1 text-lg font-bold tabular-nums text-arena-gold">
                    <Coins className="h-4 w-4" />
                    {profile.totalPoints.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-arena-silver/70">
                    保有ポイント
                  </p>
                  <Link
                    href="/points/history"
                    className="mt-1 inline-block text-[11px] text-arena-primary-soft hover:underline"
                  >
                    ポイント履歴
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-arena-silver/70">
                    <span>次のリーグまで</span>
                    {profile.league.next && (
                      <span className="font-semibold text-arena-white">
                        {profile.league.pointsToNext} pt
                      </span>
                    )}
                  </div>
                  <ProgressBar value={profile.league.progressRatio * 100} />
                  <p className="mt-1 text-[11px] text-arena-silver/60">
                    {profile.league.next
                      ? `次のリーグ: ${profile.league.next.displayName}`
                      : "最高リーグに到達しています"}
                  </p>
                </div>
                {profile.league.next && (
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <LeagueBadgeIcon
                      themeKey={profile.league.next.themeKey}
                      className="h-8 w-8"
                    />
                    <span className="text-[10px] text-arena-silver/70">
                      {Math.round(profile.league.progressRatio * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <p className="flex items-center gap-1 text-[11px] text-arena-silver/60">
                最高リーグ:{" "}
                <span className="font-semibold text-arena-white">
                  {highestLeague.displayName}
                </span>
                {highestLeague.reachedAt && (
                  <span>
                    （
                    {new Date(highestLeague.reachedAt).toLocaleDateString(
                      "ja-JP",
                    )}
                    ）
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </RainbowLuxuryFrame>

        <Button
          asChild
          variant="gold"
          size="default"
          className="relative overflow-hidden border border-arena-gold/50 shadow-[0_0_20px_-6px_rgba(224,178,86,0.6)]"
        >
          <Link
            href={inTournament ? resumeHref(resume) : "/leagues"}
            className="flex items-center justify-center gap-2"
          >
            <Swords className="h-4 w-4" />
            {inTournament ? "対戦を続ける" : "トーナメントに参加"}
            <Sparkles className="h-3.5 w-3.5 opacity-80" />
          </Link>
        </Button>

        <DailyBonusCard />

        <DailyMissionsCard />

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-arena-border bg-arena-surface-2/60 px-2.5 py-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
            <p className="flex items-center gap-1 text-[10px] font-medium text-arena-silver/70">
              <Trophy className="h-3 w-3 text-arena-gold" />
              総勝利数
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-arena-white">
              {profile.totalWins}
              <span className="ml-0.5 text-xs font-normal text-arena-silver/70">
                勝
              </span>
            </p>
            <Badge variant="gold" className="mt-1 text-[10px]">
              TOP {rank.percentile.toFixed(1)}%
            </Badge>
          </div>
          <div className="rounded-xl border border-arena-border bg-arena-surface-2/60 px-2.5 py-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
            <p className="flex items-center gap-1 text-[10px] font-medium text-arena-silver/70">
              <Flame className="h-3 w-3 text-arena-danger" />
              連勝記録
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-arena-white">
              {profile.bestWinStreak}
              <span className="ml-0.5 text-xs font-normal text-arena-silver/70">
                連勝
              </span>
            </p>
            {isBestStreak ? (
              <Badge variant="success" className="mt-1 text-[10px]">
                自己ベスト!
              </Badge>
            ) : (
              <p className="mt-1 text-[10px] text-arena-silver/60">
                現在{profile.currentWinStreak}連勝中
              </p>
            )}
          </div>
          <div className="rounded-xl border border-arena-border bg-arena-surface-2/60 px-2.5 py-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
            <p className="flex items-center gap-1 text-[10px] font-medium text-arena-silver/70">
              <Crown className="h-3 w-3 text-arena-gold" />
              最高到達リーグ
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <LeagueBadgeIcon
                themeKey={highestLeague.themeKey}
                className="h-6 w-6"
              />
              <span className="truncate text-sm font-semibold text-arena-white">
                {highestLeague.displayName}
              </span>
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-arena-silver">
              最近の結果
            </h2>
            <Link href="/history" className="text-xs text-arena-primary-soft">
              すべて見る
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="まだ対戦記録がありません"
              description="最初のトーナメントに参加してみましょう。"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((match) => (
                <Card key={match.matchId}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        match.won
                          ? "bg-arena-success/15 text-arena-success"
                          : "bg-arena-danger/15 text-arena-danger"
                      }`}
                    >
                      {match.won ? "WIN" : "LOSE"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-arena-white">
                        {match.gameName}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-arena-silver">
                        {profile.showBotTag && match.opponentIsBot && (
                          <Bot className="h-3 w-3 shrink-0" />
                        )}
                        vs {match.opponentName}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="announcements" className="flex flex-col gap-2 scroll-mt-4">
          <h2 className="text-sm font-semibold text-arena-silver">お知らせ</h2>
          {ANNOUNCEMENTS.length === 0 ? (
            <EmptyState icon={Megaphone} title="現在お知らせはありません" />
          ) : (
            <div className="flex flex-col gap-2">
              {ANNOUNCEMENTS.map((announcement) => (
                <Card
                  key={announcement.id}
                  className="border-arena-gold/25 bg-gradient-to-b from-arena-gold/5 to-transparent"
                >
                  <CardContent className="flex flex-col gap-1.5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Megaphone className="h-3.5 w-3.5 shrink-0 text-arena-gold" />
                      <p className="text-sm font-semibold text-arena-white">
                        {announcement.title}
                      </p>
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-arena-gold/90">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {announcement.date}
                    </p>
                    <p className="text-xs leading-relaxed text-arena-silver">
                      {announcement.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppScreen>
  );
}
