"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils/cn";
import { Check, Coins, Gift } from "lucide-react";

interface MilestoneStatus {
  code: string;
  name: string;
  requiredScore: number;
  rewardPoints: number;
  rewardPrizeCurrency: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

function rewardLabel(milestone: MilestoneStatus): string {
  const parts = [`${milestone.rewardPoints.toLocaleString()}P`];
  if (milestone.rewardPrizeCurrency > 0) parts.push(`賞金${milestone.rewardPrizeCurrency.toLocaleString()}`);
  return parts.join(" + ");
}

/** The only interactive piece of the (otherwise server-rendered) event detail page. On a
 * successful claim, router.refresh() re-runs the server component so the milestone list, the
 * profile's updated point/prize totals, and the leaderboard all reflect the new state — mirrors
 * JoinTournamentButton's split-out-client-piece pattern on the league detail page. */
export function EventMilestoneList({ eventId, milestones }: { eventId: string; milestones: MilestoneStatus[] }) {
  const router = useRouter();
  const { vibrate, playTone } = usePreferences();
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(code: string) {
    setClaimingCode(code);
    setError(null);
    try {
      await apiClient.post(`/api/events/${eventId}/milestones/${code}/claim`);
      vibrate([20, 40, 20]);
      playTone("achievement");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "受け取りに失敗しました。");
    } finally {
      setClaimingCode(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-arena-danger">{error}</p>}
      {milestones.map((milestone) => (
        <Card key={milestone.code}>
          <CardContent className="flex items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm font-medium", milestone.claimed ? "text-arena-silver/50 line-through" : "text-arena-white")}>
                  {milestone.name}
                </p>
                <span className="shrink-0 text-xs text-arena-silver/60">{rewardLabel(milestone)}</span>
              </div>
              <ProgressBar value={(milestone.progress / milestone.requiredScore) * 100} className="mt-1.5 h-1.5" />
              <p className="mt-1 text-[11px] text-arena-silver/60 tabular-nums">
                {milestone.progress.toLocaleString()} / {milestone.requiredScore.toLocaleString()} 勝
              </p>
            </div>
            <div className="w-20 shrink-0 text-right">
              {milestone.claimed ? (
                <Check className="ml-auto h-4 w-4 text-arena-success" />
              ) : milestone.completed ? (
                <Button variant="gold" size="sm" className="h-8 px-2.5 text-[11px]" onClick={() => handleClaim(milestone.code)} disabled={claimingCode === milestone.code}>
                  <Coins className="h-3.5 w-3.5" />
                  受取
                </Button>
              ) : (
                <Gift className="ml-auto h-4 w-4 text-arena-silver/30" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
