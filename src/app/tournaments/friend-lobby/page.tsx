"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";

interface LeagueSummary {
  id: string;
  displayName: string;
  requiredPoints: number;
  themeKey: string;
  unlocked: boolean;
}

interface InvitableFriend {
  profileId: string;
  displayName: string;
  username: string;
  league: { displayName: string };
}

export default function FriendLobbyPage() {
  return (
    <Suspense fallback={<AppScreen><LoadingState /></AppScreen>}>
      <FriendLobbyContent />
    </Suspense>
  );
}

function FriendLobbyContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("league");
  return leagueId ? <FriendPicker leagueId={leagueId} /> : <LeaguePicker />;
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
    <AppScreen header={<FocusHeader title="フレンドと大会を開く" backHref="/leagues" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <p className="text-xs text-arena-silver">大会を開くリーグを選択してください。</p>
        {error && <ErrorState message={error} />}
        {!error && !leagues && <LoadingState />}
        {leagues && (
          <div className="flex flex-col gap-2">
            {leagues.map((league) => (
              <button
                key={league.id}
                disabled={!league.unlocked}
                onClick={() => router.push(`/tournaments/friend-lobby?league=${league.id}`)}
                className="text-left disabled:opacity-50"
              >
                <Card>
                  <CardContent className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <LeagueBadgeIcon themeKey={league.themeKey} className={cn("h-8 w-8", !league.unlocked && "opacity-30 grayscale")} />
                      <p className="text-sm font-semibold text-arena-white">{league.displayName}</p>
                    </div>
                    {!league.unlocked && <Lock className="h-4 w-4 shrink-0 text-arena-silver/60" />}
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

function FriendPicker({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [friends, setFriends] = useState<InvitableFriend[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiClient
      .get<InvitableFriend[]>(`/api/tournaments/invitable-friends?leagueId=${leagueId}`)
      .then(setFriends)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "フレンドの取得に失敗しました。"));
  }, [leagueId]);

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const tournament = await apiClient.post<{ id: string }>("/api/tournaments/friend-lobby", {
        leagueId,
        inviteeProfileIds: Array.from(selected),
      });
      router.push(`/tournaments/${tournament.id}/matchmaking`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "作成に失敗しました。");
      setCreating(false);
    }
  }

  return (
    <AppScreen header={<FocusHeader title="招待するフレンド" backHref="/tournaments/friend-lobby" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <Card className="border-arena-primary/20 bg-arena-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Users className="h-4 w-4 shrink-0 text-arena-primary-soft" />
            <p className="text-xs text-arena-silver">選んだフレンドに招待が届きます。参加を待つ間に不足分はBOTが補充されます。</p>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-arena-danger">{error}</p>}
        {!error && !friends && <LoadingState />}
        {friends && friends.length === 0 && (
          <EmptyState icon={Users} title="招待できるフレンドがいません" description="このリーグに参加できるフレンドがいないか、全員すでに他の大会に参加中です。" />
        )}
        {friends && friends.length > 0 && (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => {
              const isSelected = selected.has(friend.profileId);
              return (
                <button key={friend.profileId} type="button" onClick={() => toggle(friend.profileId)} className="text-left">
                  <Card className={cn(isSelected && "border-arena-primary")}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-arena-white">{friend.displayName}</p>
                        <p className="text-xs text-arena-silver/70">@{friend.username}</p>
                        <p className="text-xs text-arena-silver">{friend.league.displayName}</p>
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          isSelected ? "border-arena-primary bg-arena-primary text-white" : "border-arena-border",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        {friends && friends.length > 0 && (
          <Button variant="gold" onClick={handleCreate} disabled={creating || selected.size === 0}>
            {creating ? "作成中…" : `${selected.size}人を招待して開く`}
          </Button>
        )}
      </div>
    </AppScreen>
  );
}
