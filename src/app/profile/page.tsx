import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import {
  getMyAchievementCatalog,
  getMyGameStats,
  getMyProfile,
} from "@/features/profiles/profile.service";
import { getMyWinRateTrend } from "@/features/profiles/match-history.service";
import { listLeaguesWithUnlockStatus } from "@/features/leagues/league.service";
import { AppScreen } from "@/components/layout/app-screen";
import { StatTile } from "@/components/common/stat-tile";
import { EmptyState } from "@/components/common/empty-state";
import { PlayerAvatar } from "@/components/common/player-avatar";
import { WinRateTrendChart } from "@/components/common/win-rate-trend-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  BookOpen,
  Coins,
  Compass,
  Crown,
  Eye,
  Flame,
  Gem,
  HelpCircle,
  Lock,
  Pencil,
  Settings,
  Shield,
  ShoppingBag,
  Skull,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { TITLES } from "@/config/titles";
import { BACKGROUND_GRADIENTS, BADGE_ICON_KEYS } from "@/config/shop-items";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { RainbowLuxuryFrame } from "@/components/common/rainbow-luxury";
import { getLeagueLuxury } from "@/config/league-visuals";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

const BADGE_ICONS: Record<string, LucideIcon> = {
  Flame,
  Star,
  Skull,
  Gem,
  Crown,
  Zap,
  Shield,
  Eye,
  Target,
  Compass,
};

function ProfileLinkRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-arena-border bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-arena-white transition-colors hover:border-arena-primary/40"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-arena-primary-soft" />
        {label}
      </span>
      <span className="text-arena-silver/60">›</span>
    </Link>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getMyProfile(session.user.id);
  const [gameStats, achievements, leagues, winRateTrend] = await Promise.all([
    getMyGameStats(session.user.id),
    getMyAchievementCatalog(session.user.id),
    listLeaguesWithUnlockStatus(profile.totalPoints),
    getMyWinRateTrend(session.user.id),
  ]);
  const unlockedAchievementCount = achievements.filter(
    (a) => a.unlocked,
  ).length;

  const title =
    TITLES.find((t) => t.id === profile.selectedTitleId) ?? TITLES[0];
  const trophyByLeague = new Map(profile.trophies.map((t) => [t.leagueId, t]));
  const backgroundGradient = profile.background
    ? BACKGROUND_GRADIENTS[profile.background.assetKey]
    : null;
  const BadgeIcon = profile.badge
    ? BADGE_ICONS[BADGE_ICON_KEYS[profile.badge.assetKey]]
    : null;
  const luxury = getLeagueLuxury(profile.league.current.themeKey);
  const luxuryStyle = {
    ...(luxury.level >= 2 && !luxury.rainbow
      ? { boxShadow: `0 0 30px -10px ${luxury.glowColor}` }
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
      <div className="flex flex-col gap-5 px-4 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-arena-white">プロフィール</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-arena-border text-arena-silver"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-arena-border text-arena-silver"
            >
              <Settings className="h-4 w-4" />
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
                    backgroundGradient ?? luxury.headerGradient,
                  ),
              !luxury.rainbow && luxury.level >= 3 && "arena-glow-pulse",
              !luxury.rainbow && luxury.level >= 4 && "arena-shimmer",
            )}
            style={luxuryStyle}
          >
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="relative">
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
                      "h-20 w-20 text-2xl",
                      luxury.rainbow
                        ? "border-transparent"
                        : luxury.avatarBorder,
                    )}
                    iconClassName="h-9 w-9"
                  />
                </RainbowLuxuryFrame>
                {BadgeIcon && (
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-arena-surface bg-arena-gold/20">
                    <BadgeIcon className="h-3.5 w-3.5 text-arena-gold" />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-arena-white">
                {profile.displayName}
              </p>
              <Badge variant="gold">{title.name}</Badge>
              <div className="flex items-center gap-2">
                <Badge className={luxury.badgeClass}>
                  {luxury.level >= 4 && <Crown className="h-3 w-3" />}
                  <LeagueBadgeIcon themeKey={profile.league.current.themeKey} />
                  {profile.league.current.displayName}
                </Badge>
                <Badge variant="neutral">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {profile.frame.current.name}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-arena-gold">
                    {profile.totalPoints.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-arena-silver/60">ポイント</p>
                </div>
                <div className="h-8 w-px bg-arena-border" />
                <div className="text-center">
                  <p className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-arena-gold">
                    <Coins className="h-4 w-4" />
                    {profile.prizeCurrency.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-arena-silver/60">賞金</p>
                  <p className="text-[9px] text-arena-silver/40">
                    生涯 {profile.lifetimePrizeCurrency.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </RainbowLuxuryFrame>

        <div className="flex flex-col gap-2">
          <ProfileLinkRow
            href="/leaderboard"
            icon={Trophy}
            label="ランキング"
          />
          <ProfileLinkRow href="/shop" icon={ShoppingBag} label="ショップ" />
          <ProfileLinkRow href="/friends" icon={Users} label="フレンド" />
          <ProfileLinkRow href="/how-to-play" icon={BookOpen} label="遊び方" />
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">
            トロフィーケース
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {leagues.map((league) => {
              const trophy = trophyByLeague.get(league.id);
              return (
                <div
                  key={league.id}
                  title={league.displayName}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-xl border py-2.5",
                    trophy
                      ? "border-arena-gold/40 bg-arena-gold/10"
                      : "border-arena-border bg-arena-surface-2/40",
                  )}
                >
                  <LeagueBadgeIcon
                    themeKey={league.themeKey}
                    className={cn("h-7 w-7", !trophy && "opacity-25 grayscale")}
                  />
                  <span className="max-w-full truncate px-1 text-[9px] text-arena-silver/70">
                    {league.displayName.replace("リーグ", "")}
                  </span>
                  {trophy && trophy.count > 1 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-arena-gold px-1 text-[9px] font-bold text-arena-bg">
                      {trophy.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="総対戦数" value={profile.totalMatches} />
          <StatTile label="総勝利数" value={profile.totalWins} />
          <StatTile label="総敗北数" value={profile.totalLosses} />
          <StatTile label="心理戦勝率" value={`${profile.winRate}%`} accent />
          <StatTile label="最高連勝" value={profile.bestWinStreak} />
          <StatTile label="現在連勝" value={profile.currentWinStreak} />
          <StatTile label="大会参加数" value={profile.tournamentEntries} />
          <StatTile label="優勝回数" value={profile.tournamentWins} />
          <StatTile label="決勝進出数" value={profile.finalsReached} />
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">
            最近の成績推移
          </h2>
          <WinRateTrendChart data={winRateTrend} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">
            ゲーム別勝率
          </h2>
          {gameStats.length === 0 ? (
            <EmptyState title="まだプレイ記録がありません" />
          ) : (
            <div className="flex flex-col gap-2">
              {gameStats.map((stat) => (
                <Card key={stat.gameTypeId}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-arena-white">
                        {stat.gameName}
                      </p>
                      <p className="text-xs text-arena-silver">
                        {stat.matches}戦 {stat.wins}勝{stat.losses}敗
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-arena-gold">
                      {stat.winRate}%
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-arena-silver">実績</h2>
            <span className="text-[11px] tabular-nums text-arena-silver/50">
              {unlockedAchievementCount}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((entry) => (
              <Card
                key={entry.code}
                className={cn(!entry.unlocked && "opacity-70")}
              >
                <CardContent className="py-3">
                  {entry.hidden ? (
                    <div className="flex flex-col items-center gap-1 py-1.5 text-center">
                      <HelpCircle className="h-4 w-4 text-arena-silver/40" />
                      <p className="text-xs font-semibold text-arena-silver/50">
                        ？？？
                      </p>
                      <p className="text-[10px] text-arena-silver/35">
                        隠し実績
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        {entry.unlocked ? (
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-arena-gold" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-arena-silver/40" />
                        )}
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            entry.unlocked
                              ? "text-arena-white"
                              : "text-arena-silver/60",
                          )}
                        >
                          {entry.name}
                        </p>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-arena-silver/60">
                        {entry.description}
                      </p>
                      {!entry.unlocked &&
                        entry.progress !== null &&
                        entry.target !== null && (
                          <div className="mt-1.5">
                            <ProgressBar
                              value={(entry.progress / entry.target) * 100}
                              className="h-1"
                            />
                            <p className="mt-0.5 text-[10px] tabular-nums text-arena-silver/40">
                              {entry.progress}/{entry.target}
                            </p>
                          </div>
                        )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppScreen>
  );
}
