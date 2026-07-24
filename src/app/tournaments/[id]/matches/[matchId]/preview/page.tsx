"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Swords } from "lucide-react";

interface MatchPreview {
  matchId: string;
  round: number;
  gameName: string;
  tournamentLeagueName: string;
  opponent: {
    displayName: string;
    isBot: boolean;
    leagueName: string | null;
    winRate: number | null;
    totalMatches: number | null;
  };
}

export default function PreMatchPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  const router = useRouter();
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiClient
      .get<MatchPreview>(`/api/matches/${matchId}/preview`)
      .then(setPreview)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "対戦情報の取得に失敗しました。"));
  }, [matchId]);

  async function handleStart() {
    setStarting(true);
    try {
      await apiClient.post(`/api/matches/${matchId}/session`);
      router.push(`/tournaments/${id}/matches/${matchId}/play`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "対戦の開始に失敗しました。");
      setStarting(false);
    }
  }

  if (error) return <AppScreen header={<FocusHeader title="対戦前" backHref={`/tournaments/${id}/bracket`} />}><ErrorState message={error} /></AppScreen>;
  if (!preview) return <AppScreen header={<FocusHeader title="対戦前" backHref={`/tournaments/${id}/bracket`} />}><LoadingState /></AppScreen>;

  return (
    <AppScreen header={<FocusHeader title="対戦前" backHref={`/tournaments/${id}/bracket`} />}>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-arena-border bg-arena-surface-2">
            {preview.opponent.isBot ? <Bot className="h-7 w-7 text-arena-silver" /> : <Swords className="h-7 w-7 text-arena-gold" />}
          </div>
          <p className="text-lg font-bold text-arena-white">{preview.opponent.displayName}</p>
          {preview.opponent.isBot && <Badge variant="neutral">BOT</Badge>}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <Row label="所属リーグ" value={preview.opponent.leagueName ?? "—"} />
            <Row label="心理戦勝率" value={preview.opponent.winRate !== null ? `${preview.opponent.winRate}%` : "データなし"} />
            <Row label="対戦経験" value={preview.opponent.totalMatches !== null ? `${preview.opponent.totalMatches}戦` : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-xs font-semibold text-arena-silver">使用ゲーム</p>
            <Badge variant="gold">{preview.gameName}</Badge>
          </CardContent>
        </Card>

        <div className="flex-1" />
        <Button onClick={handleStart} disabled={starting}>
          {starting ? "準備中…" : "対戦開始"}
        </Button>
      </div>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-arena-silver">{label}</span>
      <span className="font-medium text-arena-white">{value}</span>
    </div>
  );
}
