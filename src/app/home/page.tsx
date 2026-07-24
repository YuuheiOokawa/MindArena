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
import { Megaphone, Trophy } from "lucide-react";
import { resumeHref } from "@/features/tournaments/resume-href";

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
      <div className="flex flex-col gap-5 px-4 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-arena-silver">ようこそ</p>
            <h1 className="text-lg font-bold text-arena-white">{profile.displayName}</h1>
          </div>
          <Badge variant="gold">{profile.league.current.displayName}</Badge>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-arena-silver">保有ポイント</p>
                <p className="text-3xl font-bold tabular-nums text-arena-gold">{profile.totalPoints.toLocaleString()}</p>
              </div>
              {profile.league.next && (
                <p className="text-right text-xs text-arena-silver">
                  次のリーグまで
                  <br />
                  <span className="text-sm font-semibold text-arena-white">{profile.league.pointsToNext} pt</span>
                </p>
              )}
            </div>
            <ProgressBar value={profile.league.progressRatio * 100} />
            <p className="text-[11px] text-arena-silver/70">
              {profile.league.next ? `次のリーグ: ${profile.league.next.displayName}` : "最高リーグに到達しています"}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="勝率" value={`${profile.winRate}%`} accent />
          <StatTile label="連勝中" value={profile.currentWinStreak} />
          <StatTile label="優勝回数" value={profile.tournamentWins} />
        </div>

        <Button asChild size="default">
          <Link href={inTournament ? resumeHref(resume) : "/tournaments/join"}>
            {inTournament ? "対戦を続ける" : "トーナメントに参加する"}
          </Link>
        </Button>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">最近の対戦結果</h2>
          {recent.length === 0 ? (
            <EmptyState icon={Trophy} title="まだ対戦記録がありません" description="最初のトーナメントに参加してみましょう。" />
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((match) => (
                <Card key={match.matchId}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-arena-white">{match.gameName}</p>
                      <p className="text-xs text-arena-silver">vs {match.opponentName}</p>
                    </div>
                    <Badge variant={match.won ? "success" : "danger"}>{match.won ? "WIN" : "LOSE"}</Badge>
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
