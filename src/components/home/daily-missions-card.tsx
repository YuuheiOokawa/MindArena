"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { usePreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils/cn";
import { Check, ClipboardList, Coins } from "lucide-react";

interface MissionStatus {
  code: string;
  name: string;
  description: string;
  target: number;
  progress: number;
  rewardPoints: number;
  rewardPrizeCurrency: number;
  completed: boolean;
  claimed: boolean;
}

function rewardLabel(mission: MissionStatus): string {
  const parts = [`${mission.rewardPoints}P`];
  if (mission.rewardPrizeCurrency > 0) parts.push(`賞金${mission.rewardPrizeCurrency}`);
  return parts.join(" + ");
}

export function DailyMissionsCard() {
  const { vibrate, playTone } = usePreferences();
  const [missions, setMissions] = useState<MissionStatus[] | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiClient
      .get<MissionStatus[]>("/api/daily-missions")
      .then(setMissions)
      .catch(() => undefined); // non-critical widget — fails silently, home page still works
  }

  useEffect(load, []);

  async function handleClaim(code: string) {
    setClaimingCode(code);
    setError(null);
    try {
      await apiClient.post("/api/daily-missions/claim", { missionCode: code });
      vibrate([20, 40, 20]);
      playTone("achievement");
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "受け取りに失敗しました。");
    } finally {
      setClaimingCode(null);
    }
  }

  if (!missions) return null;

  const unclaimedCompleted = missions.filter((m) => m.completed && !m.claimed).length;

  return (
    <Card className="border-arena-primary/25">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-arena-white">
            <ClipboardList className="h-4 w-4 text-arena-primary-soft" />
            今日のミッション
          </p>
          {unclaimedCompleted > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-arena-gold px-1.5 text-[10px] font-bold text-arena-bg">
              {unclaimedCompleted}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-arena-danger">{error}</p>}

        <div className="flex flex-col gap-2.5">
          {missions.map((mission) => (
            <div key={mission.code} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-xs font-medium", mission.claimed ? "text-arena-silver/50 line-through" : "text-arena-white")}>
                    {mission.name}
                  </p>
                  <span className="shrink-0 text-[10px] text-arena-silver/60">{rewardLabel(mission)}</span>
                </div>
                <ProgressBar value={(mission.progress / mission.target) * 100} className="mt-1 h-1.5" />
              </div>
              <div className="w-16 shrink-0 text-right">
                {mission.claimed ? (
                  <Check className="ml-auto h-4 w-4 text-arena-success" />
                ) : mission.completed ? (
                  <Button variant="gold" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleClaim(mission.code)} disabled={claimingCode === mission.code}>
                    <Coins className="h-3 w-3" />
                    受取
                  </Button>
                ) : (
                  <span className="text-[10px] text-arena-silver/50">
                    {mission.progress}/{mission.target}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
