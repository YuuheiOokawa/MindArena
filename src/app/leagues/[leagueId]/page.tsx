import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getLeagueDetail } from "@/features/leagues/league.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { JoinTournamentButton } from "@/components/leagues/join-tournament-button";
import { Dices, UserPlus, Users } from "lucide-react";

export default async function LeagueDetailPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await playerProfileRepository.findByUserId(session.user.id);
  if (!profile) redirect("/login");

  const league = await getLeagueDetail(leagueId, profile.totalPoints);

  return (
    <AppScreen header={<FocusHeader title={league.displayName} backHref="/leagues" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex justify-center">
          <LeagueBadgeIcon themeKey={league.themeKey} className={league.unlocked ? "h-28 w-28" : "h-28 w-28 opacity-30 grayscale"} />
        </div>
        <Badge variant={league.unlocked ? "success" : "neutral"} className="w-fit">
          {league.unlocked ? "解放済み" : `必要ポイント ${league.requiredPoints.toLocaleString()}`}
        </Badge>
        <p className="text-sm text-arena-silver">{league.description}</p>

        <Card>
          <CardContent className="grid grid-cols-2 gap-3 py-4">
            <RewardTile label="優勝報酬" value={league.championReward} />
            <RewardTile label="準優勝報酬" value={league.runnerUpReward} />
            <RewardTile label="ベスト4報酬" value={league.topFourReward} />
            <RewardTile label="参加報酬" value={league.participationReward} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-xs font-semibold text-arena-silver">使用可能ゲーム</p>
            {league.games.map((game) => (
              <div key={game.id} className="flex items-center justify-between text-sm">
                <span className="text-arena-white">{game.name}</span>
                <span className="text-xs text-arena-silver">{game.totalRounds}ラウンド</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-xs font-semibold text-arena-silver">BOT難易度</p>
            <Badge variant="gold">{league.botDifficulty}</Badge>
          </CardContent>
        </Card>

        {league.unlocked && (
          <>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Users className="h-5 w-5 shrink-0 text-arena-silver" />
                <p className="text-xs text-arena-silver">
                  32人制シングルエリミネーション。同じリーグ以上のフレンドには自動で招待が届き、参加人数が不足している場合はBOTが自動で補充されます。
                </p>
              </CardContent>
            </Card>

            <Link
              href={`/tournaments/friend-lobby?league=${league.id}`}
              className="flex items-center justify-between rounded-2xl border border-arena-border bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-arena-white transition-colors hover:border-arena-primary/40"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-arena-primary-soft" />
                招待するフレンドを自分で選ぶ
              </span>
              <span className="text-arena-silver/60">›</span>
            </Link>

            <Card className="border-arena-primary/20 bg-arena-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <Dices className="h-5 w-5 shrink-0 text-arena-primary-soft" />
                <p className="text-xs text-arena-silver">各試合のゲームは、対戦開始前に4種類からランダムで1つ選ばれます。</p>
              </CardContent>
            </Card>
          </>
        )}

        {league.unlocked ? <JoinTournamentButton leagueId={league.id} /> : <Button disabled>ポイントが不足しています</Button>}
      </div>
    </AppScreen>
  );
}

function RewardTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-arena-border bg-arena-surface-2/60 px-3 py-2">
      <p className="text-[11px] text-arena-silver/70">{label}</p>
      <p className="text-lg font-semibold text-arena-gold tabular-nums">{value.toLocaleString()} pt</p>
    </div>
  );
}
