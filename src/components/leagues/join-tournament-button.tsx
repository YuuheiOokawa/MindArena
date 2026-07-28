"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

/** The only interactive piece of the (otherwise server-rendered) league detail page — everything
 * else there is read-only info, so this is split out instead of making the whole page a client
 * component. Mirrors the join action that used to live on /tournaments/join?league=X. */
export function JoinTournamentButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const tournament = await apiClient.post<{ id: string }>("/api/tournaments/join", { leagueId });
      router.push(`/tournaments/${tournament.id}/matchmaking`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "参加に失敗しました。");
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-arena-danger">{error}</p>}
      <Button variant="gold" onClick={handleJoin} disabled={joining}>
        {joining ? "参加処理中…" : "トーナメントに参加する"}
      </Button>
    </div>
  );
}
