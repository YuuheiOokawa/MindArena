"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dices, Lock, UserPlus, Users } from "lucide-react";
import Link from "next/link";

interface LeagueSummary {
  id: string;
  displayName: string;
  description: string;
  requiredPoints: number;
  championReward: number;
  botDifficulty: string;
  unlocked: boolean;
}

interface LeagueDetail extends LeagueSummary {
  games: { id: string; name: string }[];
}

export default function TournamentJoinPage() {
  return (
    <Suspense fallback={<AppScreen nav><LoadingState /></AppScreen>}>
      <TournamentJoinContent />
    </Suspense>
  );
}

function TournamentJoinContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("league");

  return leagueId ? <JoinConfirm leagueId={leagueId} /> : <LeaguePicker />;
}

function LeaguePicker() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<LeagueSummary[]>("/api/leagues")
      .then(setLeagues)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "リーグの取得に失敗しました。"));
  }, []);

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">参加するリーグを選択</h1>
          <p className="text-xs text-arena-silver">解放済みのリーグからトーナメントに参加できます。</p>
        </header>

        {error && <ErrorState message={error} />}
        {!error && !leagues && <LoadingState />}
        {leagues && (
          <div className="flex flex-col gap-2">
            {leagues.map((league) => (
              <button
                key={league.id}
                disabled={!league.unlocked}
                onClick={() => router.push(`/tournaments/join?league=${league.id}`)}
                className="text-left disabled:opacity-50"
              >
                <Card>
                  <CardContent className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-arena-white">{league.displayName}</p>
                      <p className="text-xs text-arena-silver">優勝報酬 {league.championReward.toLocaleString()} pt</p>
                    </div>
                    {!league.unlocked && <Lock className="h-4 w-4 text-arena-silver/60" />}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppScreen>
  );
}

function JoinConfirm({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    apiClient
      .get<LeagueDetail>(`/api/leagues/${leagueId}`)
      .then(setLeague)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "リーグの取得に失敗しました。"));
  }, [leagueId]);

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

  if (error && !league) return <AppScreen nav><ErrorState message={error} /></AppScreen>;
  if (!league) return <AppScreen nav><LoadingState /></AppScreen>;

  if (!league.unlocked) {
    return (
      <AppScreen nav>
        <div className="px-4 pt-6">
          <EmptyState icon={Lock} title="このリーグはまだ解放されていません" description={`必要ポイント: ${league.requiredPoints.toLocaleString()}`} />
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">{league.displayName}</h1>
          <p className="text-xs text-arena-silver">{league.description}</p>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <Row label="優勝報酬" value={`${league.championReward.toLocaleString()} pt`} />
            <Row label="BOT難易度" value={<Badge variant="gold">{league.botDifficulty}</Badge>} />
            <Row label="使用ゲーム" value={league.games.map((g) => g.name).join(" / ")} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Users className="h-5 w-5 text-arena-silver" />
            <p className="text-xs text-arena-silver">
              32人制シングルエリミネーション。同じリーグ以上のフレンドには自動で招待が届き、参加人数が不足している場合はBOTが自動で補充されます。
            </p>
          </CardContent>
        </Card>

        <Link
          href={`/tournaments/friend-lobby?league=${leagueId}`}
          className="flex items-center justify-between rounded-2xl border border-arena-border bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-arena-white transition-colors hover:border-arena-primary/40"
        >
          <span className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-arena-primary-soft" />
            招待するフレンドを自分で選ぶ
          </span>
          <span className="text-arena-silver/60">›</span>
        </Link>

        <Card className="border-arena-primary/20 bg-arena-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Dices className="h-5 w-5 text-arena-primary-soft" />
            <p className="text-xs text-arena-silver">
              各試合のゲームは、対戦開始前に4種類からランダムで1つ選ばれます。
            </p>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-arena-danger">{error}</p>}

        <Button variant="gold" onClick={handleJoin} disabled={joining}>
          {joining ? "参加処理中…" : "トーナメントに参加する"}
        </Button>
      </div>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-arena-silver">{label}</span>
      <span className="font-medium text-arena-white">{value}</span>
    </div>
  );
}
