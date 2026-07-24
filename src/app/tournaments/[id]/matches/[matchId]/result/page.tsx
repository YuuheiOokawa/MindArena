"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/common/confetti-burst";
import { AnimatedNumber } from "@/components/common/animated-number";
import { resumeHref } from "@/features/tournaments/resume-href";
import type { ResumeScreen } from "@/features/tournaments/resume";
import { Coins, Trophy, XCircle } from "lucide-react";

interface MatchResultView {
  won: boolean;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  tournamentId: string;
  pointsEarned: number;
}

export default function MatchResultPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  const router = useRouter();
  const [result, setResult] = useState<MatchResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    apiClient
      .get<MatchResultView>(`/api/matches/${matchId}/result`)
      .then(setResult)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "結果の取得に失敗しました。"));
  }, [matchId]);

  async function handleNext() {
    setNavigating(true);
    try {
      const resume = await apiClient.get<ResumeScreen>("/api/tournaments/resume");
      router.push(resumeHref(resume));
    } catch {
      router.push(`/tournaments/${id}/bracket`);
    }
  }

  if (error) return <AppScreen><ErrorState message={error} /></AppScreen>;
  if (!result) return <AppScreen><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {result.won && <ConfettiBurst />}
        {result.won ? (
          <div
            className="arena-pop-in arena-glow-pulse flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-gold/60 bg-arena-gold/10"
            style={{ "--arena-glow-color": "rgba(224, 178, 86, 0.6)" } as React.CSSProperties}
          >
            <Trophy className="h-9 w-9 text-arena-gold" />
          </div>
        ) : (
          <div className="arena-pop-in arena-shake-once flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-danger/40 bg-arena-danger/10">
            <XCircle className="h-9 w-9 text-arena-danger" />
          </div>
        )}
        <div className="arena-pop-in" style={{ animationDelay: "0.15s" }}>
          <p className={`text-3xl font-black tracking-wide ${result.won ? "text-arena-gold" : "text-arena-danger"}`}>
            {result.won ? "WIN" : "LOSE"}
          </p>
          <p className="mt-1 text-sm text-arena-silver">vs {result.opponentName}</p>
        </div>

        <Card className="w-full arena-pop-in" style={{ animationDelay: "0.25s" }}>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-around">
              <ScoreBlock label="あなた" value={result.myScore} />
              <p className="text-arena-silver">-</p>
              <ScoreBlock label="相手" value={result.opponentScore} />
            </div>
            {result.pointsEarned > 0 && (
              <>
                <div className="h-px bg-arena-border" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-arena-silver">獲得ポイント</span>
                  <span className="flex items-center gap-1 text-base font-bold tabular-nums text-arena-gold">
                    <Coins className="h-4 w-4" />+<AnimatedNumber value={result.pointsEarned} />P
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex w-full flex-col gap-2">
          <Button variant="gold" onClick={handleNext} disabled={navigating}>
            {navigating ? "移動中…" : "次へ進む"}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/tournaments/${id}/bracket`)}>
            トーナメント表へ戻る
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}

function ScoreBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-arena-silver/70">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-arena-white">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
