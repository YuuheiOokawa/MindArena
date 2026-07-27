"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/common/confetti-burst";
import { BracketTree, roundLabel, type BracketRound } from "@/components/bracket/bracket-tree";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Bot, Swords, ChevronsUp, LogOut } from "lucide-react";

interface MatchView {
  id: string;
  matchNumber: number;
  status: string;
  player1: { id: string; name: string; isBot: boolean } | null;
  player2: { id: string; name: string; isBot: boolean } | null;
  winnerParticipantId: string | null;
  involvesMe: boolean;
}

interface TournamentView {
  id: string;
  status: string;
  currentRound: number;
  leagueName: string;
  maxPlayers: number;
  myParticipantId: string | null;
  winnerParticipantId: string | null;
  canWithdraw: boolean;
  rounds: BracketRound[];
}

function Avatar({ participant, showBotTag }: { participant: MatchView["player1"]; showBotTag: boolean }) {
  if (!participant) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-arena-border text-arena-silver/40">
        ?
      </div>
    );
  }
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-arena-primary/40 bg-arena-surface-2 text-sm font-bold text-arena-primary-soft">
      {participant.name.slice(0, 1)}
      {showBotTag && participant.isBot && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-arena-surface-2 ring-2 ring-arena-surface">
          <Bot className="h-2.5 w-2.5 text-arena-silver" />
        </span>
      )}
    </div>
  );
}

export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showBotTag } = usePreferences();
  const [view, setView] = useState<TournamentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once from the URL on first render (never re-derived from a later searchParams change —
  // dismissing clears the query param via router.replace, which must not resurrect this).
  const [showAdvance, setShowAdvance] = useState(() => searchParams.get("advanced") === "1");
  // matchId -> winnerParticipantId as of the last render where we captured it — diffed against
  // each new poll to detect "this match just resolved" (see freshMatchIds below). null baseline
  // means "haven't captured a first snapshot yet"; nothing is flagged fresh on that first render,
  // since a match that was already decided before this page ever loaded isn't actually new.
  const [winnerBaseline, setWinnerBaseline] = useState<Record<string, string | null> | null>(null);
  const [freshMatchIds, setFreshMatchIds] = useState<Set<string>>(new Set());
  const [retryToken, setRetryToken] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // A single transient failure shouldn't strand a player watching the bracket with a dead end
    // — keep retrying quietly with backoff, and only surface a terminal error (with a manual
    // retry) after several in a row.
    let consecutiveFailures = 0;
    const MAX_SILENT_RETRIES = 6;

    async function poll() {
      try {
        const data = await apiClient.get<TournamentView>(`/api/tournaments/${id}`);
        if (cancelled) return;
        consecutiveFailures = 0;
        setView(data);
        if (data.status === "IN_PROGRESS") timer = setTimeout(poll, 2500);
      } catch (e) {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures <= MAX_SILENT_RETRIES) {
          timer = setTimeout(poll, Math.min(2500 * consecutiveFailures, 10_000));
          return;
        }
        setError(e instanceof ApiClientError ? e.message : "対戦表の取得に失敗しました。");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, retryToken]);

  async function handleWithdraw() {
    if (!window.confirm("この大会を棄権しますか？この操作は取り消せません。")) return;
    setWithdrawing(true);
    try {
      await apiClient.post(`/api/tournaments/${id}/withdraw`);
      router.push("/home");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "棄権に失敗しました。");
      setWithdrawing(false);
    }
  }

  if (error) {
    return (
      <AppScreen nav header={<FocusHeader title="対戦表" backHref="/home" />}>
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setRetryToken((t) => t + 1);
          }}
        />
      </AppScreen>
    );
  }
  if (!view) return <AppScreen nav header={<FocusHeader title="対戦表" backHref="/home" />}><LoadingState /></AppScreen>;

  if (showAdvance) {
    const clearedRound = roundLabel(view.currentRound - 1, Math.log2(view.maxPlayers));
    return (
      <AppScreen nav header={<FocusHeader title={view.leagueName} backHref="/home" />}>
        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <ConfettiBurst count={24} />
          <div
            className="arena-pop-in arena-glow-pulse flex h-20 w-20 items-center justify-center rounded-full border-2 border-arena-primary bg-arena-primary/10"
            style={{ "--arena-glow-color": "rgba(139, 92, 246, 0.6)" } as React.CSSProperties}
          >
            <ChevronsUp className="h-9 w-9 text-arena-primary-soft" />
          </div>
          <div className="arena-pop-in" style={{ animationDelay: "0.15s" }}>
            <p className="text-2xl font-black tracking-wide text-arena-primary-soft">勝ち上がり！</p>
            <p className="mt-1 text-sm text-arena-silver">{clearedRound}を突破しました</p>
          </div>
          <Button
            className="arena-pop-in w-full"
            style={{ animationDelay: "0.25s" }}
            onClick={() => {
              setShowAdvance(false);
              router.replace(`/tournaments/${id}/bracket`);
            }}
          >
            対戦表を見る
          </Button>
        </div>
      </AppScreen>
    );
  }

  const currentRoundData = view.rounds.find((r) => r.round === view.currentRound);
  const myMatch = currentRoundData?.matches.find((m) => m.involvesMe);
  const myMatchPlayable = myMatch && (myMatch.status === "READY" || myMatch.status === "IN_PROGRESS");

  // Adjusting state during render (React's documented pattern for deriving state from a changing
  // prop) — bails out and re-renders before committing, so this never shows stale fresh-match
  // highlighting a render behind the data that triggered it.
  const currentWinners: Record<string, string | null> = {};
  for (const r of view.rounds) for (const m of r.matches) currentWinners[m.id] = m.winnerParticipantId;

  const isFirstLoad = winnerBaseline === null;
  if (isFirstLoad) {
    setWinnerBaseline(currentWinners);
  } else {
    const changedIds = Object.keys(currentWinners).filter(
      (matchId) => currentWinners[matchId] && currentWinners[matchId] !== winnerBaseline[matchId],
    );
    if (changedIds.length > 0) {
      setWinnerBaseline(currentWinners);
      setFreshMatchIds((prev) => {
        const next = new Set(prev);
        changedIds.forEach((matchId) => next.add(matchId));
        return next;
      });
    }
  }

  return (
    <AppScreen nav header={<FocusHeader title={view.leagueName} backHref="/home" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-arena-silver">現在のラウンド</p>
          <Badge variant="primary">{roundLabel(view.currentRound, Math.log2(view.maxPlayers))}</Badge>
        </div>

        {myMatch && (
          <Card className="border-arena-primary/40 bg-gradient-to-b from-arena-primary/10 to-transparent">
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-arena-primary-soft">
                <Swords className="h-3.5 w-3.5" />
                次の対戦・第{myMatch.matchNumber}試合
              </p>
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center gap-1">
                  <Avatar participant={myMatch.player1} showBotTag={showBotTag} />
                  <span className="max-w-20 truncate text-xs text-arena-silver">{myMatch.player1?.name ?? "未対戦"}</span>
                </div>
                <span className="text-xs font-bold text-arena-silver/60">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <Avatar participant={myMatch.player2} showBotTag={showBotTag} />
                  <span className="max-w-20 truncate text-xs text-arena-silver">{myMatch.player2?.name ?? "未対戦"}</span>
                </div>
              </div>
              {myMatchPlayable && (
                <Button onClick={() => router.push(`/tournaments/${id}/matches/${myMatch.id}/preview`)}>対戦へ進む</Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs text-arena-silver">トーナメント表（横スクロールできます）</p>
          <BracketTree
            rounds={view.rounds}
            totalRounds={Math.log2(view.maxPlayers)}
            freshMatchIds={freshMatchIds}
            playEntrance={isFirstLoad}
            showBotTag={showBotTag}
          />
        </div>

        {view.canWithdraw && (
          <Button variant="ghost" onClick={handleWithdraw} disabled={withdrawing} className="text-arena-danger">
            <LogOut className="h-4 w-4" />
            {withdrawing ? "処理しています…" : "この大会を棄権する"}
          </Button>
        )}
      </div>
    </AppScreen>
  );
}
