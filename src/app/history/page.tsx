import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getMyMatchHistory } from "@/features/profiles/match-history.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppScreen } from "@/components/layout/app-screen";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Bot } from "lucide-react";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [matches, profile] = await Promise.all([
    getMyMatchHistory(session.user.id, undefined, 30),
    playerProfileRepository.findByUserId(session.user.id),
  ]);
  const showBotTag = profile?.showBotTag ?? true;

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">対戦履歴</h1>
        </header>

        {matches.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="対戦履歴がありません" description="トーナメントに参加して最初の対戦をしましょう。" />
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((match) => (
              <Card key={match.matchId}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-arena-white">{match.gameName}</p>
                    <p className="flex items-center gap-1 text-xs text-arena-silver">
                      {showBotTag && match.opponentIsBot && <Bot className="h-3 w-3" />}
                      vs {match.opponentName} ・ {match.leagueName}
                    </p>
                    <p className="text-[11px] text-arena-silver/60">
                      {match.completedAt ? new Date(match.completedAt).toLocaleString("ja-JP") : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={match.won ? "success" : "danger"}>{match.won ? "WIN" : "LOSE"}</Badge>
                    <p className="mt-1 text-xs tabular-nums text-arena-silver">
                      {match.myScore ?? 0} - {match.opponentScore ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
