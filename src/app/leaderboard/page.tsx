"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { PlayerAvatar } from "@/components/common/player-avatar";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { Crown, Globe, Layers, Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  playerProfileId: string;
  displayName: string;
  avatarIconId: string | null;
  customAvatarUrl: string | null;
  titleName: string;
  totalPoints: number;
  leagueDisplayName: string;
  leagueThemeKey: string;
  isMe: boolean;
}

interface LeaderboardData {
  scope: "global" | "league";
  entries: LeaderboardEntry[];
  totalPlayers: number;
  myRank: number;
  myEntry: LeaderboardEntry | null;
}

type Scope = "global" | "league";

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("global");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Reset the stale previous scope's result during render (not in the effect below) the moment
  // `scope` changes, so the loading state shows immediately instead of the old tab's data
  // lingering until the new fetch resolves.
  const [trackedScope, setTrackedScope] = useState(scope);
  if (scope !== trackedScope) {
    setTrackedScope(scope);
    setData(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<LeaderboardData>(`/api/leaderboard?scope=${scope}`)
      .then((result) => !cancelled && setData(result))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "ランキングの取得に失敗しました。"));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <AppScreen nav header={<FocusHeader title="ランキング" backHref="/profile" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex gap-2">
          <ScopeButton active={scope === "global"} onClick={() => setScope("global")} icon={Globe}>
            全体
          </ScopeButton>
          <ScopeButton active={scope === "league"} onClick={() => setScope("league")} icon={Layers}>
            自リーグ
          </ScopeButton>
        </div>

        {error && <ErrorState message={error} onRetry={() => setScope((s) => s)} />}
        {!error && !data && <LoadingState label="ランキングを読み込んでいます…" />}

        {!error && data && (
          <>
            <p className="text-xs text-arena-silver/70">
              {scope === "global" ? "全プレイヤー" : "同じリーグのプレイヤー"} 全{data.totalPlayers.toLocaleString()}人中 —
              あなたの順位 <span className="font-semibold text-arena-gold">#{data.myRank.toLocaleString()}</span>
            </p>

            <div className="flex flex-col gap-2">
              {data.entries.map((entry) => (
                <LeaderboardRow key={entry.playerProfileId} entry={entry} showLeague={scope === "global"} />
              ))}
            </div>

            {data.myEntry && (
              <>
                <div className="flex items-center gap-2 text-[11px] text-arena-silver/50">
                  <div className="h-px flex-1 bg-arena-border" />
                  あなたの順位
                  <div className="h-px flex-1 bg-arena-border" />
                </div>
                <LeaderboardRow entry={data.myEntry} showLeague={scope === "global"} />
              </>
            )}
          </>
        )}
      </div>
    </AppScreen>
  );
}

const RANK_STYLE: Record<number, string> = {
  1: "bg-arena-gold/20 text-arena-gold border-arena-gold/40",
  2: "bg-slate-300/15 text-slate-200 border-slate-300/30",
  3: "bg-amber-700/15 text-amber-500 border-amber-700/30",
};

function LeaderboardRow({ entry, showLeague }: { entry: LeaderboardEntry; showLeague: boolean }) {
  return (
    <Card className={cn(entry.isMe && "border-arena-primary/50 bg-arena-primary/5")}>
      <CardContent className="flex items-center gap-3 py-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
            RANK_STYLE[entry.rank] ?? "border-arena-border bg-arena-surface-2 text-arena-silver",
          )}
        >
          {entry.rank <= 3 ? <Crown className="h-3.5 w-3.5" /> : entry.rank}
        </div>
        <PlayerAvatar
          displayName={entry.displayName}
          avatarIconId={entry.avatarIconId}
          photoUrl={entry.customAvatarUrl}
          className="h-9 w-9 text-sm"
          iconClassName="h-4 w-4"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-arena-white">
            {entry.displayName}
            {entry.isMe && <span className="ml-1.5 text-[10px] font-normal text-arena-primary-soft">(あなた)</span>}
          </p>
          <p className="truncate text-[11px] text-arena-silver/70">
            {entry.titleName}
            {showLeague && (
              <span className="ml-1.5 inline-flex items-center gap-1">
                <LeagueBadgeIcon themeKey={entry.leagueThemeKey} className="h-3 w-3" />
                {entry.leagueDisplayName}
              </span>
            )}
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-arena-gold">
          <Trophy className="h-3.5 w-3.5" />
          {entry.totalPoints.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function ScopeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-arena-primary/50 bg-arena-primary/15 text-arena-primary-soft"
          : "border-arena-border bg-white/[0.03] text-arena-silver hover:border-arena-primary/30",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
