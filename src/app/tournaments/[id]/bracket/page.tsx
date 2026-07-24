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
import { cn } from "@/lib/utils/cn";
import { Bot, Crown } from "lucide-react";

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

export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [view, setView] = useState<TournamentView | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const activeRound = view.rounds.find((r) => r.round === selectedRound) ?? view.rounds[view.rounds.length - 1];
  const myMatch = activeRound?.matches.find((m) => m.involvesMe);
  const myMatchPlayable = myMatch && (myMatch.status === "READY" || myMatch.status === "IN_PROGRESS");

  return (
    <AppScreen nav header={<FocusHeader title={view.leagueName} backHref="/home" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-arena-silver">現在のラウンド</p>
          <Badge variant="gold">{ROUND_LABELS[view.currentRound] ?? `第${view.currentRound}ラウンド`}</Badge>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {view.rounds.map((r) => (
            <button
              key={r.round}
              onClick={() => setSelectedRound(r.round)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                r.round === (selectedRound ?? view.currentRound)
                  ? "border-arena-gold bg-arena-gold/15 text-arena-gold"
                  : "border-arena-border text-arena-silver hover:border-arena-silver/40",
              )}
            >
              {ROUND_LABELS[r.round] ?? `第${r.round}ラウンド`}
            </button>
          ))}
        </div>

        {myMatchPlayable && (
          <Button onClick={() => router.push(`/tournaments/${id}/matches/${myMatch!.id}/preview`)}>次の対戦へ進む</Button>
        )}

        <div className="flex flex-col gap-2">
          {activeRound?.matches.map((match) => (
            <Card key={match.id} className={match.involvesMe ? "border-arena-gold/50" : ""}>
              <CardContent className="flex flex-col gap-2 py-3">
                <ParticipantRow participant={match.player1} winnerId={match.winnerParticipantId} status={match.status} />
                <div className="h-px bg-arena-border" />
                <ParticipantRow participant={match.player2} winnerId={match.winnerParticipantId} status={match.status} />
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
}: {
  participant: MatchView["player1"];
  winnerId: string | null;
  status: string;
}) {
  if (!participant) {
    return <p className="text-sm text-arena-silver/50">未対戦</p>;
  }
  const isWinner = winnerId === participant.id;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {participant.isBot && <Bot className="h-3.5 w-3.5 text-arena-silver/60" />}
        <span className={cn("text-sm", isWinner ? "font-semibold text-arena-white" : "text-arena-silver")}>{participant.name}</span>
      </div>
      {status === "COMPLETED" && isWinner && <Crown className="h-4 w-4 text-arena-gold" />}
    </div>
  );
}
