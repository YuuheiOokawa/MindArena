"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { ErrorState } from "@/components/common/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users } from "lucide-react";

interface TournamentView {
  id: string;
  status: string;
  participantCount: number;
  maxPlayers: number;
  isCreator: boolean;
  pendingInvites: number;
  joinedPlayers: { name: string; isMe: boolean }[];
}

export default function MatchmakingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [view, setView] = useState<TournamentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // A single transient failure shouldn't strand a player in the matchmaking queue with a dead
    // end — keep retrying quietly with backoff, and only surface a terminal error (with a manual
    // retry) after several in a row.
    let consecutiveFailures = 0;
    const MAX_SILENT_RETRIES = 6;

    async function poll() {
      try {
        const data = await apiClient.get<TournamentView>(`/api/tournaments/${id}`);
        if (cancelled) return;
        consecutiveFailures = 0;
        setView(data);
        if (data.status !== "RECRUITING") {
          setReady(true);
          timer = setTimeout(() => router.push(`/tournaments/${id}/bracket`), 1100);
          return;
        }
        timer = setTimeout(poll, 800);
      } catch (e) {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures <= MAX_SILENT_RETRIES) {
          timer = setTimeout(poll, Math.min(800 * consecutiveFailures, 8000));
          return;
        }
        setError(e instanceof ApiClientError ? e.message : "マッチング状況の取得に失敗しました。");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, router, retryToken]);

  async function handleStartNow() {
    setStarting(true);
    try {
      await apiClient.post(`/api/tournaments/${id}/start-now`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "開始に失敗しました。");
      setStarting(false);
    }
  }

  if (error) {
    return (
      <AppScreen>
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

  const count = view?.participantCount ?? 1;
  const max = view?.maxPlayers ?? 32;
  const invitedFriendsWaiting = view && view.pendingInvites > 0;

  return (
    <AppScreen>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-arena-gold/40 bg-arena-gold/10">
          {ready ? <CheckCircle2 className="h-8 w-8 text-arena-gold" /> : <Users className="h-8 w-8 animate-pulse text-arena-gold" />}
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-arena-white">
            {count} <span className="text-arena-silver">/ {max}</span>
          </p>
          <p className="mt-1 text-sm text-arena-silver">
            {ready
              ? "対戦表を生成しています…"
              : invitedFriendsWaiting
                ? `フレンドの参加を待っています…（残り${view!.pendingInvites}人・不足分はBOTが補充されます）`
                : "参加者を集めています…（不足分はBOTが補充されます）"}
          </p>
        </div>
        <ProgressBar value={(count / max) * 100} className="w-full max-w-xs" />

        {view && view.joinedPlayers.length > 1 && !ready && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {view.joinedPlayers.map((p) => (
              <span
                key={p.name}
                className="rounded-full border border-arena-border bg-arena-surface-2 px-2.5 py-1 text-[11px] text-arena-silver"
              >
                {p.isMe ? "あなた" : p.name}
              </span>
            ))}
          </div>
        )}

        {view?.isCreator && !ready && (
          <Button variant="secondary" onClick={handleStartNow} disabled={starting} className="w-full max-w-xs">
            {starting ? "開始しています…" : "今すぐ開始する"}
          </Button>
        )}
      </div>
    </AppScreen>
  );
}
