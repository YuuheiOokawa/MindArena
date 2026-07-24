import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getMyAchievements, getMyGameStats, getMyProfile } from "@/features/profiles/profile.service";
import { AppScreen } from "@/components/layout/app-screen";
import { StatTile } from "@/components/common/stat-tile";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles, Trophy, Users } from "lucide-react";
import { TITLES } from "@/config/titles";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, gameStats, achievements] = await Promise.all([
    getMyProfile(session.user.id),
    getMyGameStats(session.user.id),
    getMyAchievements(session.user.id),
  ]);

  const title = TITLES.find((t) => t.id === profile.selectedTitleId) ?? TITLES[0];

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-arena-white">プロフィール</h1>
          <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-arena-border text-arena-silver">
            <Settings className="h-4 w-4" />
          </Link>
        </header>

        <Card className="border-arena-primary/30 bg-gradient-to-b from-arena-primary/10 to-transparent">
          <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-primary bg-arena-surface-2 text-2xl font-bold text-arena-primary-soft">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-lg font-bold text-arena-white">{profile.displayName}</p>
            <Badge variant="gold">{title.name}</Badge>
            <div className="flex items-center gap-2">
              <Badge variant="primary">{profile.league.current.displayName}</Badge>
              <Badge variant="neutral">
                <Sparkles className="mr-1 h-3 w-3" />
                {profile.frame.current.name}
              </Badge>
            </div>
            <p className="text-2xl font-bold tabular-nums text-arena-gold">{profile.totalPoints.toLocaleString()} pt</p>
          </CardContent>
        </Card>

        <Link
          href="/friends"
          className="flex items-center justify-between rounded-2xl border border-arena-border bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-arena-white transition-colors hover:border-arena-primary/40"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-arena-primary-soft" />
            フレンド
          </span>
          <span className="text-arena-silver/60">›</span>
        </Link>

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
          <h2 className="text-sm font-semibold text-arena-silver">ゲーム別勝率</h2>
          {gameStats.length === 0 ? (
            <EmptyState title="まだプレイ記録がありません" />
          ) : (
            <div className="flex flex-col gap-2">
              {gameStats.map((stat) => (
                <Card key={stat.gameTypeId}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-arena-white">{stat.gameName}</p>
                      <p className="text-xs text-arena-silver">{stat.matches}戦 {stat.wins}勝{stat.losses}敗</p>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-arena-gold">{stat.winRate}%</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">獲得実績</h2>
          {achievements.length === 0 ? (
            <EmptyState icon={Trophy} title="まだ実績がありません" description="対戦を重ねて実績を解放しよう。" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-3">
                    <p className="text-sm font-semibold text-arena-white">{entry.achievement.name}</p>
                    <p className="mt-0.5 text-[11px] text-arena-silver">{entry.achievement.description}</p>
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
