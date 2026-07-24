import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getMyProfile } from "@/features/profiles/profile.service";
import { getMyMatchHistory } from "@/features/profiles/match-history.service";
import { resolveResumeState } from "@/features/tournaments/resume";
import { AppScreen } from "@/components/layout/app-screen";
import { StatTile } from "@/components/common/stat-tile";
import { EmptyState } from "@/components/common/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Bot, Coins, Mail, Megaphone, Swords, Trophy } from "lucide-react";
import { resumeHref } from "@/features/tournaments/resume-href";
import { APP_CONFIG } from "@/config/app";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, recent, resume] = await Promise.all([
    getMyProfile(session.user.id),
    getMyMatchHistory(session.user.id, undefined, 3),
    resolveResumeState(session.user.id),
  ]);

  // "champion" is a one-time celebration screen reached right after the winning match, not a
  // place to route back into from Home — once seen, Home should offer a fresh tournament again.
  const inTournament = resume.screen !== "home" && resume.screen !== "champion";

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-arena-primary/40 bg-arena-primary/15">
              <span className="text-xs font-bold text-arena-primary-soft">M</span>
            </div>
            <span className="text-sm font-bold tracking-wide text-arena-white">{APP_CONFIG.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-arena-silver/80 hover:text-arena-white">
              <Bell className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-arena-silver/80 hover:text-arena-white">
              <Mail className="h-4 w-4" />
            </button>
          </div>
        </header>

        <Card className="border-arena-primary/25">
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-arena-primary/50 bg-arena-surface-2 text-lg font-bold text-arena-primary-soft">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-arena-white">{profile.displayName}</p>
                <Badge variant="primary" className="mt-1">
                  {profile.league.current.displayName}
                </Badge>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-lg font-bold tabular-nums text-arena-gold">
                  <Coins className="h-4 w-4" />
                  {profile.totalPoints.toLocaleString()}
                </p>
                <p className="text-[11px] text-arena-silver/70">保有ポイント</p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-arena-silver/70">
                <span>次のリーグまで</span>
                {profile.league.next && <span className="font-semibold text-arena-white">{profile.league.pointsToNext} pt</span>}
              </div>
              <ProgressBar value={profile.league.progressRatio * 100} />
              <p className="mt-1 text-[11px] text-arena-silver/60">
                {profile.league.next ? `次のリーグ: ${profile.league.next.displayName}` : "最高リーグに到達しています"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button asChild variant="gold" size="default">
          <Link href={inTournament ? resumeHref(resume) : "/tournaments/join"} className="flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" />
            {inTournament ? "対戦を続ける" : "トーナメントに参加"}
          </Link>
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="勝率" value={`${profile.winRate}%`} accent />
          <StatTile label="連勝中" value={profile.currentWinStreak} />
          <StatTile label="優勝回数" value={profile.tournamentWins} />
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-arena-silver">最近の結果</h2>
            <Link href="/history" className="text-xs text-arena-primary-soft">
              すべて見る
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={Swords} title="まだ対戦記録がありません" description="最初のトーナメントに参加してみましょう。" />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((match) => (
                <Card key={match.matchId}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        match.won ? "bg-arena-success/15 text-arena-success" : "bg-arena-danger/15 text-arena-danger"
                      }`}
                    >
                      {match.won ? "WIN" : "LOSE"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-arena-white">{match.gameName}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-arena-silver">
                        {match.opponentIsBot && <Bot className="h-3 w-3 shrink-0" />}
                        vs {match.opponentName}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">お知らせ</h2>
          <EmptyState icon={Megaphone} title="現在お知らせはありません" />
        </section>
      </div>
    </AppScreen>
  );
}
