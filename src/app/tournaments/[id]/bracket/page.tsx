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
import { cn } from "@/lib/utils/cn";
import { Bot, Crown, Swords, ChevronsUp } from "lucide-react";

const ROUND_LABELS: Record<number, string> = {
  1: "1回戦",
  2: "2回戦",
  3: "準々決勝",
  4: "準決勝",
  5: "決勝",
};

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
  myParticipantId: string | null;
  winnerParticipantId: string | null;
  rounds: { round: number; matches: MatchView[] }[];
}

function Avatar({ participant }: { participant: MatchView["player1"] }) {
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
      {participant.isBot && (
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
  const [view, setView] = useState<TournamentView | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once from the URL on first render (never re-derived from a later searchParams change —
  // dismissing clears the query param via router.replace, which must not resurrect this).
  const [showAdvance, setShowAdvance] = useState(() => searchParams.get("advanced") === "1");
  // The round rendered on the previous commit — used to detect "just switched to a new round" so
  // its rise-in entrance plays once, not on every poll refresh of the same round's data.
  const [prevRoundNumber, setPrevRoundNumber] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await apiClient.get<TournamentView>(`/api/tournaments/${id}`);
        if (cancelled) return;
        setView(data);
        setSelectedRound((prev) => prev ?? data.currentRound);
        if (data.status === "IN_PROGRESS") timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiClientError ? e.message : "対戦表の取得に失敗しました。");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (error) return <AppScreen nav header={<FocusHeader title="対戦表" backHref="/home" />}><ErrorState message={error} /></AppScreen>;
  if (!view) return <AppScreen nav header={<FocusHeader title="対戦表" backHref="/home" />}><LoadingState /></AppScreen>;

  if (showAdvance) {
    const clearedRound = ROUND_LABELS[view.currentRound - 1] ?? `第${view.currentRound - 1}ラウンド`;
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

  const activeRound = view.rounds.find((r) => r.round === selectedRound) ?? view.rounds[view.rounds.length - 1];
  const currentRoundData = view.rounds.find((r) => r.round === view.currentRound);
  const myMatch = currentRoundData?.matches.find((m) => m.involvesMe);
  const myMatchPlayable = myMatch && (myMatch.status === "READY" || myMatch.status === "IN_PROGRESS");

  // Round 1 has no predecessor to "rise up" from — only round 2+ gets the advance entrance, and
  // only on the render where the active round just changed (a poll refresh of the same round's
  // data must not replay it). Adjusting state during render, per React's documented pattern for
  // "reset/derive state when a prop changes" — this bails out and re-renders before committing.
  if (activeRound && activeRound.round !== prevRoundNumber) {
    setPrevRoundNumber(activeRound.round);
  }
  const playAdvanceAnimation = Boolean(activeRound) && activeRound!.round > 1 && activeRound!.round !== prevRoundNumber;
  const previousRoundLabel = activeRound ? (ROUND_LABELS[activeRound.round - 1] ?? `第${activeRound.round - 1}ラウンド`) : "";

  return (
    <AppScreen nav header={<FocusHeader title={view.leagueName} backHref="/home" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-arena-silver">現在のラウンド</p>
          <Badge variant="primary">{ROUND_LABELS[view.currentRound] ?? `第${view.currentRound}ラウンド`}</Badge>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {view.rounds.map((r) => (
            <button
              key={r.round}
              onClick={() => setSelectedRound(r.round)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                r.round === (selectedRound ?? view.currentRound)
                  ? "border-arena-primary bg-arena-primary/15 text-arena-primary-soft"
                  : "border-arena-border text-arena-silver hover:border-arena-silver/40",
              )}
            >
              {ROUND_LABELS[r.round] ?? `第${r.round}ラウンド`}
            </button>
          ))}
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
                  <Avatar participant={myMatch.player1} />
                  <span className="max-w-20 truncate text-xs text-arena-silver">{myMatch.player1?.name ?? "未対戦"}</span>
                </div>
                <span className="text-xs font-bold text-arena-silver/60">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <Avatar participant={myMatch.player2} />
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
          {activeRound?.matches.map((match, index) => (
            <Card
              key={match.id}
              className={cn(match.involvesMe ? "border-arena-primary/50" : "", playAdvanceAnimation && "arena-rise-in")}
              style={playAdvanceAnimation ? ({ "--arena-rise-delay": `${Math.min(index, 8) * 0.06}s` } as React.CSSProperties) : undefined}
            >
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-arena-silver/50">第{match.matchNumber}試合</span>
                  {match.involvesMe && <Badge variant="primary">あなた</Badge>}
                </div>
                <ParticipantRow
                  participant={match.player1}
                  winnerId={match.winnerParticipantId}
                  status={match.status}
                  advancedFromLabel={activeRound.round > 1 ? previousRoundLabel : undefined}
                />
                <div className="h-px bg-arena-border" />
                <ParticipantRow
                  participant={match.player2}
                  winnerId={match.winnerParticipantId}
                  status={match.status}
                  advancedFromLabel={activeRound.round > 1 ? previousRoundLabel : undefined}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppScreen>
  );
}

function ParticipantRow({
  participant,
  winnerId,
  status,
  advancedFromLabel,
}: {
  participant: MatchView["player1"];
  winnerId: string | null;
  status: string;
  /** Set to the previous round's label (e.g. "1回戦") when this row belongs to round 2+, so an
   * existing participant here is shown as having just advanced from that round. */
  advancedFromLabel?: string;
}) {
  if (!participant) {
    return <p className="text-sm text-arena-silver/50">未対戦</p>;
  }
  const isWinner = winnerId === participant.id;
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {participant.isBot && <Bot className="h-3.5 w-3.5 text-arena-silver/60" />}
          <span className={cn("text-sm", isWinner ? "font-semibold text-arena-white" : "text-arena-silver")}>{participant.name}</span>
        </div>
        {advancedFromLabel && (
          <span className="flex items-center gap-0.5 text-[10px] text-arena-primary-soft/80">
            <ChevronsUp className="h-2.5 w-2.5" />
            {advancedFromLabel}を突破
          </span>
        )}
      </div>
      {status === "COMPLETED" && isWinner && <Crown className="h-4 w-4 text-arena-gold" />}
    </div>
  );
}
