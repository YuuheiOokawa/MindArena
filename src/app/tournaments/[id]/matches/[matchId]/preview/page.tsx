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
import { PlayerAvatar } from "@/components/common/player-avatar";
import { getGameMeta } from "@/config/games";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Bot, Dices } from "lucide-react";

interface MatchPreview {
  matchId: string;
  round: number;
  matchNumber: number;
  gameName: string;
  gameId: string;
  tournamentLeagueName: string;
  me: {
    displayName: string;
    username: string | null;
    leagueName: string | null;
    leagueThemeKey: string | null;
    avatarIconId: string | null;
    photoUrl: string | null;
    winRate: number | null;
  };
  opponent: {
    displayName: string;
    username: string | null;
    isBot: boolean;
    leagueName: string | null;
    leagueThemeKey: string | null;
    avatarIconId: string | null;
    photoUrl: string | null;
    winRate: number | null;
    totalMatches: number | null;
    botStyle: { label: string; description: string } | null;
  };
}

export default function PreMatchPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  // Keyed on matchId so navigating straight from one match's preview to the next never renders a
  // stale flash of the previous match's opponent/game while the new fetch is in flight.
  return <PreMatchSession key={matchId} id={id} matchId={matchId} />;
}

function PreMatchSession({ id, matchId }: { id: string; matchId: string }) {
  const router = useRouter();
  const { showBotTag } = usePreferences();
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
              <PlayerAvatar
                displayName={preview.me.displayName}
                avatarIconId={preview.me.avatarIconId}
                photoUrl={preview.me.photoUrl}
                className="h-16 w-16"
                iconClassName="h-7 w-7"
              />
              <p className="max-w-24 truncate text-sm font-semibold text-arena-white">{preview.me.displayName}</p>
              {preview.me.leagueName && (
                <Badge variant="primary">
                  <LeagueBadgeIcon themeKey={preview.me.leagueThemeKey ?? ""} />
                  {preview.me.leagueName}
                </Badge>
              )}
              <p className="text-xs font-semibold text-arena-gold">勝率 {preview.me.winRate ?? 0}%</p>
            </div>
            <span className="text-sm font-black text-arena-silver/50">VS</span>
            <div className="flex flex-col items-center gap-1.5">
              {preview.opponent.isBot ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-arena-border bg-arena-surface-2">
                  <Bot className="h-7 w-7 text-arena-silver" />
                </div>
              ) : (
                <PlayerAvatar
                  displayName={preview.opponent.displayName}
                  avatarIconId={preview.opponent.avatarIconId}
                  photoUrl={preview.opponent.photoUrl}
                  className="h-16 w-16 border-arena-border"
                  iconClassName="h-7 w-7"
                />
              )}
              <p className="max-w-24 truncate text-sm font-semibold text-arena-white">{preview.opponent.displayName}</p>
              {preview.opponent.username && (
                <p className="max-w-24 truncate text-[11px] text-arena-silver/70">@{preview.opponent.username}</p>
              )}
              {preview.opponent.leagueName && (
                <Badge variant="neutral">
                  <LeagueBadgeIcon themeKey={preview.opponent.leagueThemeKey ?? ""} />
                  {preview.opponent.leagueName}
                </Badge>
              )}
              <p className="text-xs font-semibold text-arena-gold">勝率 {preview.opponent.winRate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>

        {showBotTag && preview.opponent.isBot && (
          <div className="-mt-3 flex justify-center">
            <Badge variant="neutral">BOT対戦</Badge>
          </div>
        )}

        {preview.opponent.botStyle && (
          <Card className="-mt-2 border-arena-gold/25 bg-arena-gold/5">
            <CardContent className="py-3">
              <p className="text-xs font-semibold text-arena-gold">相手のスタイル: {preview.opponent.botStyle.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-arena-silver">{preview.opponent.botStyle.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-arena-primary-soft">
            <Dices className="h-3.5 w-3.5" />
            今回の試合で選ばれたゲーム
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
