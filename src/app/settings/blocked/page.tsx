"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

interface BlockedUser {
  blockId: string;
  reason: string | null;
  createdAt: string;
  profileId: string;
  displayName: string;
  username: string;
}

export default function BlockedUsersPage() {
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  function load() {
    apiClient
      .get<BlockedUser[]>("/api/friends/blocked")
      .then(setBlocked)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。"));
  }

  useEffect(load, []);

  async function handleUnblock(profileId: string) {
    setPending(profileId);
    try {
      await apiClient.delete(`/api/friends/blocked/${profileId}`);
      setBlocked((prev) => prev?.filter((b) => b.profileId !== profileId) ?? null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "解除に失敗しました。");
    } finally {
      setPending(null);
    }
  }

  return (
    <AppScreen header={<FocusHeader title="ブロック中のユーザー" backHref="/settings" />}>
      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !blocked && <LoadingState />}
        {!error && blocked && blocked.length === 0 && (
          <EmptyState icon={ShieldOff} title="ブロック中のユーザーはいません" />
        )}
        {!error &&
          blocked &&
          blocked.map((b) => (
            <Card key={b.blockId}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-arena-white">{b.displayName}</p>
                  <p className="truncate text-xs text-arena-silver/70">@{b.username}</p>
                  {b.reason && <p className="mt-0.5 truncate text-[11px] text-arena-silver/50">理由: {b.reason}</p>}
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleUnblock(b.profileId)} disabled={pending === b.profileId}>
                  解除する
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </AppScreen>
  );
}
