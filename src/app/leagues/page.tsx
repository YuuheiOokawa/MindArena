import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { auth } from "@/infrastructure/auth/auth";
import { listLeaguesWithUnlockStatus } from "@/features/leagues/league.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppScreen } from "@/components/layout/app-screen";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await playerProfileRepository.findByUserId(session.user.id);
  if (!profile) redirect("/login");

  const leagues = await listLeaguesWithUnlockStatus(profile.totalPoints);

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">リーグ一覧</h1>
          <p className="text-xs text-arena-silver">ポイントを貯めて上位リーグを解放しよう。</p>
        </header>

        <div className="flex flex-col gap-2">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className={league.unlocked ? "" : "opacity-60"}>
                <CardContent className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-arena-border bg-arena-surface-2 text-arena-gold">
                      {league.unlocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
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
