import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { listLeaguesWithUnlockStatus } from "@/features/leagues/league.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppScreen } from "@/components/layout/app-screen";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { cn } from "@/lib/utils/cn";
import { Trophy } from "lucide-react";

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await playerProfileRepository.findByUserId(session.user.id);
  if (!profile) redirect("/login");

  const leagues = await listLeaguesWithUnlockStatus(profile.totalPoints);

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-arena-white">リーグ一覧</h1>
            <p className="text-xs text-arena-silver">ポイントを貯めて上位リーグを解放しよう。</p>
          </div>
          <Link
            href="/leaderboard"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-arena-gold/30 bg-arena-gold/10 px-3 py-1.5 text-xs font-medium text-arena-gold-soft"
          >
            <Trophy className="h-3.5 w-3.5" />
            ランキング
          </Link>
        </header>

        <div className="flex flex-col gap-2">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className={league.unlocked ? "" : "opacity-60"}>
                <CardContent className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-arena-border bg-arena-surface-2">
                      <LeagueBadgeIcon
                        themeKey={league.themeKey}
                        className={cn("h-8 w-8", !league.unlocked && "opacity-30 grayscale")}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-arena-white">{league.displayName}</p>
                      <p className="text-xs text-arena-silver">必要ポイント {league.requiredPoints.toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant={league.unlocked ? "success" : "neutral"}>{league.unlocked ? "解放済み" : "未解放"}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppScreen>
  );
}
