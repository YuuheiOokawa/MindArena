"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { ErrorState } from "@/components/common/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CheckCircle2, Users } from "lucide-react";

interface TournamentView {
  id: string;
  status: string;
  participantCount: number;
  maxPlayers: number;
}

export default function MatchmakingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [view, setView] = useState<TournamentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await apiClient.get<TournamentView>(`/api/tournaments/${id}`);
        if (cancelled) return;
        setView(data);
        if (data.status !== "RECRUITING") {
          setReady(true);
          timer = setTimeout(() => router.push(`/tournaments/${id}/bracket`), 1100);
          return;
        }
        timer = setTimeout(poll, 800);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiClientError ? e.message : "マッチング状況の取得に失敗しました。");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, router]);

  if (error) return <AppScreen><ErrorState message={error} /></AppScreen>;

  const count = view?.participantCount ?? 1;
  const max = view?.maxPlayers ?? 32;

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
          <p className="mt-1 text-sm text-arena-silver">{ready ? "対戦表を生成しています…" : "参加者を集めています…（不足分はBOTが補充されます）"}</p>
        </div>
        <ProgressBar value={(count / max) * 100} className="w-full max-w-xs" />
      </div>
    </AppScreen>
  );
}
