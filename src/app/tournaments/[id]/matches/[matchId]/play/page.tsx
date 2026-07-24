"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { GameBoard } from "@/components/game/game-board";
import { RoundTimer } from "@/components/game/round-timer";
import { DEFAULT_GAME_TIMERS } from "@/config/timers";

interface RawState {
  gameId: string;
  round: number;
  totalRounds: number;
  status: "IN_PROGRESS" | "AWAITING_TIEBREAK" | "COMPLETE";
  scores: Record<string, number>;
  [key: string]: unknown;
}

export default function GamePlayPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  const router = useRouter();
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [state, setState] = useState<RawState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    apiClient
      .get<{ myParticipantId: string; gameName: string; opponent: { participantId?: string } }>(`/api/matches/${matchId}/preview`)
      .then((preview) => {
        setMyParticipantId(preview.myParticipantId);
        setGameName(preview.gameName);
      })
      .catch(() => undefined);
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (navigatedRef.current) return;
      try {
        const data = await apiClient.get<RawState>(`/api/matches/${matchId}/session`);
        if (cancelled || navigatedRef.current) return;
        setState(data);
        if (data.gameId && myParticipantId) {
          const ids = Object.keys(data.scores);
          setOpponentId(ids.find((idCandidate) => idCandidate !== myParticipantId) ?? null);
        }
        if (data.status === "COMPLETE" && !navigatedRef.current) {
          navigatedRef.current = true;
          router.push(`/tournaments/${id}/matches/${matchId}/result`);
          return;
        }
        timer = setTimeout(poll, 1200);
      } catch (e) {
        if (!cancelled && !navigatedRef.current) {
          setError(e instanceof ApiClientError ? e.message : "対戦状況の取得に失敗しました。");
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, id, myParticipantId]);

  async function handleSubmit(actionType: string, actionData: unknown) {
    if (!state) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await apiClient.post<RawState>(`/api/matches/${matchId}/session/actions`, {
        round: state.round,
        actionType,
        actionData,
      });
      setState(next);
      if (next.status === "COMPLETE" && !navigatedRef.current) {
        navigatedRef.current = true;
        router.push(`/tournaments/${id}/matches/${matchId}/result`);
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "選択の送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <AppScreen header={<FocusHeader title="対戦中" />}><ErrorState message={error} /></AppScreen>;
  if (!state || !myParticipantId) return <AppScreen header={<FocusHeader title="対戦中" />}><LoadingState label="対戦を準備しています…" /></AppScreen>;

  const myScore = state.scores[myParticipantId] ?? 0;
  const oppScore = opponentId ? state.scores[opponentId] ?? 0 : 0;
  const phaseKey = `${state.round}-${(state as { phase?: string }).phase ?? ""}`;

  return (
    <AppScreen header={<FocusHeader title={gameName} />}>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-arena-silver">
            ラウンド {Math.min(state.round, state.totalRounds)} / {state.totalRounds}
          </p>
          <RoundTimer key={phaseKey} seconds={DEFAULT_GAME_TIMERS.choiceSeconds} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-arena-border bg-arena-surface-2/60 px-4 py-3">
          <ScoreBlock label="あなた" value={myScore} accent />
          <p className="text-xs text-arena-silver">VS</p>
          <ScoreBlock label="相手" value={oppScore} />
        </div>

        {opponentId && (
          <GameBoard state={state} myId={myParticipantId} opponentId={opponentId} submitting={submitting} onSubmit={handleSubmit} />
        )}

        {error && <p className="text-sm text-arena-danger">{error}</p>}
      </div>
    </AppScreen>
  );
}

function ScoreBlock({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-arena-silver/70">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-arena-gold" : "text-arena-white"}`}>{value}</p>
    </div>
  );
}
