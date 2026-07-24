"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resumeHref } from "@/features/tournaments/resume-href";
import type { ResumeScreen } from "@/features/tournaments/resume";
import { Trophy, XCircle } from "lucide-react";

interface MatchResultView {
  won: boolean;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  tournamentId: string;
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
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        {result.won ? <Trophy className="h-14 w-14 text-arena-gold" /> : <XCircle className="h-14 w-14 text-arena-danger" />}
        <div>
          <p className={`text-3xl font-black tracking-wide ${result.won ? "text-arena-gold" : "text-arena-danger"}`}>
            {result.won ? "WIN" : "LOSE"}
          </p>
          <p className="mt-1 text-sm text-arena-silver">vs {result.opponentName}</p>
        </div>

        <Card className="w-full">
          <CardContent className="flex items-center justify-around py-4">
            <ScoreBlock label="あなた" value={result.myScore} />
            <p className="text-arena-silver">-</p>
            <ScoreBlock label="相手" value={result.opponentScore} />
          </CardContent>
        </Card>

        <div className="flex w-full flex-col gap-2">
          <Button onClick={handleNext} disabled={navigating}>
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
      <p className="text-2xl font-bold tabular-nums text-arena-white">{value}</p>
    </div>
  );
}
