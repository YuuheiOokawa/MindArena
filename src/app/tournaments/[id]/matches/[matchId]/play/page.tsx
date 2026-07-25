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
import { RoundHistoryStrip } from "@/components/game/round-history-strip";
import { RoundReveal } from "@/components/game/round-reveal";
import { DEFAULT_GAME_TIMERS } from "@/config/timers";

interface RoundEntry {
  round: number;
  actions: Record<string, { actionData: Record<string, unknown> }>;
  responses?: Record<string, { actionData: Record<string, unknown> }>;
  outcome?: Record<string, number>;
}

interface RawState {
  gameId: string;
  round: number;
  totalRounds: number;
  status: "IN_PROGRESS" | "AWAITING_TIEBREAK" | "COMPLETE";
  scores: Record<string, number>;
  history: RoundEntry[];
  [key: string]: unknown;
}

export default function GamePlayPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = use(params);
  // Keyed on matchId so every match gets a fully fresh component instance — this page's refs
  // (navigatedRef, shownRoundsRef, revealPendingRef) track per-match progress and must never
  // carry over from a previous match, even if Next.js were to reuse this component across a
  // matchId change instead of remounting it.
  return <GamePlaySession key={matchId} id={id} matchId={matchId} />;
}

function GamePlaySession({ id, matchId }: { id: string; matchId: string }) {
  const router = useRouter();
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [state, setState] = useState<RawState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealEntry, setRevealEntry] = useState<RoundEntry | null>(null);
  const [isFinalReveal, setIsFinalReveal] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const navigatedRef = useRef(false);
  const shownRoundsRef = useRef<Set<number>>(new Set());
  // The background poll's setTimeout loop is created once and doesn't re-run per render, so it
  // closes over stale `revealEntry`/`isFinalReveal` state forever — reading a ref instead (always
  // current, unlike a closed-over value) is what stops it from auto-navigating to /result out
  // from under a reveal the player hasn't dismissed yet.
  const revealPendingRef = useRef(false);

  useEffect(() => {
    apiClient
      .get<{ myParticipantId: string; gameName: string; opponent: { participantId?: string } }>(`/api/matches/${matchId}/preview`)
      .then((preview) => {
        setMyParticipantId(preview.myParticipantId);
        setGameName(preview.gameName);
      })
      .catch(() => undefined);
  }, [matchId]);

  /**
   * A round that just resolved (a new `history` entry) is held back from the board with a
   * RoundReveal instead of silently jumping to the next round's buttons — otherwise a match is
   * just "pick a button, watch the score change" with no feedback on what the opponent actually
   * did. Navigation to /result on COMPLETE is deferred until the final round's reveal is
   * dismissed (see handleRevealContinue), for the same reason.
   */
  function applyIncomingState(data: RawState, myId: string | null) {
    setState(data);
    if (data.gameId && myId) {
      const ids = Object.keys(data.scores);
      setOpponentId(ids.find((idCandidate) => idCandidate !== myId) ?? null);
    }

    const lastEntry = data.history?.[data.history.length - 1];
    if (lastEntry && !shownRoundsRef.current.has(lastEntry.round)) {
      shownRoundsRef.current.add(lastEntry.round);
      revealPendingRef.current = true;
      setIsFinalReveal(data.status === "COMPLETE");
      setRevealEntry(lastEntry);
      return;
    }

    if (data.status === "COMPLETE" && !navigatedRef.current && !revealPendingRef.current) {
      navigatedRef.current = true;
      router.push(`/tournaments/${id}/matches/${matchId}/result`);
    }
  }

  function handleRevealContinue() {
    revealPendingRef.current = false;
    setRevealEntry(null);
    if (isFinalReveal && !navigatedRef.current) {
      navigatedRef.current = true;
      router.push(`/tournaments/${id}/matches/${matchId}/result`);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // A single transient failure (a mobile network blip, a momentary 5xx) shouldn't eject a
    // player from a live match they may be winning — keep retrying quietly with backoff, and
    // only surface a terminal error screen (with a manual retry) after several in a row.
    let consecutiveFailures = 0;
    const MAX_SILENT_RETRIES = 6;

    async function poll() {
      if (navigatedRef.current) return;
      // While a reveal is up, the round (or the whole match) is already resolved — polling would
      // just re-fetch the same state, and once the match is finalized server-side it 404s/409s
      // instead, which would otherwise clobber the reveal with an error screen. Idle until the
      // player dismisses it.
      if (revealPendingRef.current) {
        timer = setTimeout(poll, 1200);
        return;
      }
      try {
        const data = await apiClient.get<RawState>(`/api/matches/${matchId}/session`);
        if (cancelled || navigatedRef.current) return;
        consecutiveFailures = 0;
        applyIncomingState(data, myParticipantId);
        timer = setTimeout(poll, 1200);
      } catch (e) {
        if (cancelled || navigatedRef.current || revealPendingRef.current) return;
        consecutiveFailures += 1;
        if (consecutiveFailures <= MAX_SILENT_RETRIES) {
          timer = setTimeout(poll, Math.min(1200 * consecutiveFailures, 8000));
          return;
        }
        setError(e instanceof ApiClientError ? e.message : "対戦状況の取得に失敗しました。");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, id, myParticipantId, retryToken]);

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
      applyIncomingState(next, myParticipantId);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "選択の送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <AppScreen header={<FocusHeader title="対戦中" />}>
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
          {!revealEntry && <RoundTimer key={phaseKey} seconds={DEFAULT_GAME_TIMERS.choiceSeconds} />}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-arena-border bg-arena-surface-2/60 px-4 py-3">
          <ScoreBlock label="あなた" value={myScore} accent />
          <p className="text-xs text-arena-silver">VS</p>
          <ScoreBlock label="相手" value={oppScore} />
        </div>

        {opponentId && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-arena-silver/70">これまでの履歴</p>
            <RoundHistoryStrip totalRounds={state.totalRounds} history={state.history ?? []} myId={myParticipantId} opponentId={opponentId} />
          </div>
        )}

        {opponentId && revealEntry && (
          <RoundReveal
            state={state}
            entry={revealEntry}
            myId={myParticipantId}
            opponentId={opponentId}
            isFinalRound={isFinalReveal}
            onContinue={handleRevealContinue}
          />
        )}

        {opponentId && !revealEntry && (
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
