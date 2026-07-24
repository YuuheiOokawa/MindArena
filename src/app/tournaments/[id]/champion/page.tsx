"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface TournamentView {
  leagueName: string;
}

interface ProfileView {
  totalPoints: number;
  tournamentWins: number;
  frame: { current: { name: string } };
}

export default function ChampionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<TournamentView | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<TournamentView>(`/api/tournaments/${id}`),
      apiClient.get<ProfileView>("/api/profile/me"),
    ])
      .then(([t, p]) => {
        setTournament(t);
        setProfile(p);
      })
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "情報の取得に失敗しました。"));
  }, [id]);

  if (error) return <AppScreen><ErrorState message={error} /></AppScreen>;
  if (!tournament || !profile) return <AppScreen><LoadingState /></AppScreen>;

  return (
    <AppScreen>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-arena-gold bg-arena-gold/10 shadow-[0_0_40px_-8px_rgba(212,175,106,0.6)]">
          <Crown className="h-12 w-12 text-arena-gold" />
        </div>
        <div>
          <p className="text-2xl font-black tracking-wide text-arena-gold">優勝</p>
          <p className="mt-1 text-sm text-arena-silver">{tournament.leagueName}</p>
        </div>

        <Card className="w-full">
          <CardContent className="flex flex-col gap-3 py-4">
            <Row label="保有ポイント" value={profile.totalPoints.toLocaleString()} />
            <Row label="優勝回数" value={`${profile.tournamentWins}回`} />
            <Row label="解放中のフレーム" value={profile.frame.current.name} />
          </CardContent>
        </Card>

        <Button asChild>
          <Link href="/home">ホームへ戻る</Link>
        </Button>
      </div>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-arena-silver">{label}</span>
      <span className="font-semibold text-arena-white">{value}</span>
    </div>
  );
}
