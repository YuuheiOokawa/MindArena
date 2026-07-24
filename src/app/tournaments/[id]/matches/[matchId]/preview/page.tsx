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
import { GameRulesCard } from "@/components/common/game-rules-card";
import { getGameMeta } from "@/config/games";
import { Bot, Dices, User } from "lucide-react";

interface MatchPreview {
  matchId: string;
  round: number;
  matchNumber: number;
  gameName: string;
  gameId: string;
  tournamentLeagueName: string;
  me: {
    displayName: string;
    leagueName: string | null;
    winRate: number | null;
  };
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

  const gameMeta = getGameMeta(preview.gameId);

  return (
    <AppScreen header={<FocusHeader title={`ROUND ${preview.round} 第${preview.matchNumber}試合`} backHref={`/tournaments/${id}/bracket`} />}>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-6">
        <Card className="border-arena-primary/25">
          <CardContent className="flex items-center justify-around py-5">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-arena-primary/50 bg-arena-surface-2">
                <User className="h-7 w-7 text-arena-primary-soft" />
              </div>
              <p className="max-w-24 truncate text-sm font-semibold text-arena-white">{preview.me.displayName}</p>
              <p className="text-xs text-arena-silver">{preview.me.leagueName ?? "—"}</p>
              <p className="text-xs font-semibold text-arena-gold">勝率 {preview.me.winRate ?? 0}%</p>
            </div>
            <span className="text-sm font-black text-arena-silver/50">VS</span>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-arena-border bg-arena-surface-2">
                {preview.opponent.isBot ? <Bot className="h-7 w-7 text-arena-silver" /> : <User className="h-7 w-7 text-arena-silver" />}
              </div>
              <p className="max-w-24 truncate text-sm font-semibold text-arena-white">{preview.opponent.displayName}</p>
              <p className="text-xs text-arena-silver">{preview.opponent.leagueName ?? "—"}</p>
              <p className="text-xs font-semibold text-arena-gold">勝率 {preview.opponent.winRate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>

        {preview.opponent.isBot && (
          <div className="-mt-3 flex justify-center">
            <Badge variant="neutral">BOT対戦</Badge>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-arena-primary-soft">
            <Dices className="h-3.5 w-3.5" />
            ランダムで選ばれたゲーム
          </p>
          {gameMeta ? <GameRulesCard game={gameMeta} /> : (
            <Card>
              <CardContent className="py-4">
                <p className="text-lg font-bold text-arena-white">{preview.gameName}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex-1" />
        <Button onClick={handleStart} disabled={starting} variant="gold">
          {starting ? "準備中…" : "対戦開始"}
        </Button>
      </div>
    </AppScreen>
  );
}
