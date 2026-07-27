"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils/cn";
import { Check, Coins, Gift } from "lucide-react";

interface DailyBonusTier {
  day: number;
  points: number;
  prizeCurrency: number;
}

interface DailyBonusStatus {
  claimable: boolean;
  currentStreak: number;
  nextStreakDay: number;
  nextTier: DailyBonusTier;
  tiers: DailyBonusTier[];
}

function tierLabel(tier: DailyBonusTier): string {
  const parts = [`${tier.points}P`];
  if (tier.prizeCurrency > 0) parts.push(`賞金${tier.prizeCurrency}`);
  return parts.join(" + ");
}

export function DailyBonusCard() {
  const { vibrate, playTone } = usePreferences();
  const [status, setStatus] = useState<DailyBonusStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<DailyBonusTier | null>(null);

  useEffect(() => {
    apiClient
      .get<DailyBonusStatus>("/api/daily-bonus")
      .then(setStatus)
      .catch(() => undefined); // non-critical widget — fails silently, home page still works
  }, []);

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const result = await apiClient.post<{ streakDay: number; tier: DailyBonusTier }>("/api/daily-bonus/claim");
      setJustClaimed(result.tier);
      vibrate([20, 40, 20, 40, 20]);
      playTone("achievement");
      const refreshed = await apiClient.get<DailyBonusStatus>("/api/daily-bonus");
      setStatus(refreshed);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "受け取りに失敗しました。");
    } finally {
      setClaiming(false);
    }
  }

  if (!status) return null;

  const cycleDay = ((status.nextStreakDay - 1) % 7) + 1;

  return (
    <Card className={cn("border-arena-gold/30", status.claimable && "arena-glow-pulse")} style={status.claimable ? ({ "--arena-glow-color": "rgba(224, 178, 86, 0.35)" } as React.CSSProperties) : undefined}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-arena-white">
            <Gift className="h-4 w-4 text-arena-gold" />
            ログインボーナス
          </p>
          <p className="text-[11px] text-arena-silver/70">連続{status.currentStreak}日達成</p>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {status.tiers.map((tier) => {
            const done = tier.day < cycleDay || (tier.day === cycleDay && !status.claimable);
            const active = tier.day === cycleDay && status.claimable;
            return (
              <div
                key={tier.day}
                title={tierLabel(tier)}
                className={cn(
                  "flex h-9 flex-col items-center justify-center rounded-lg border text-[9px] font-bold",
                  done && "border-arena-success/40 bg-arena-success/10 text-arena-success",
                  active && "border-arena-gold bg-arena-gold/15 text-arena-gold",
                  !done && !active && "border-arena-border bg-arena-surface-2/60 text-arena-silver/50",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <span>{tier.day}</span>}
              </div>
            );
          })}
        </div>

        {justClaimed && (
          <p className="flex items-center gap-1 text-xs font-semibold text-arena-success">
            <Coins className="h-3.5 w-3.5" />+{tierLabel(justClaimed)} 受け取りました！
          </p>
        )}
        {error && <p className="text-xs text-arena-danger">{error}</p>}

        {status.claimable ? (
          <Button variant="gold" size="sm" onClick={handleClaim} disabled={claiming}>
            {claiming ? "受け取り中…" : `本日の報酬を受け取る（${tierLabel(status.nextTier)}）`}
          </Button>
        ) : (
          <p className="text-center text-[11px] text-arena-silver/60">本日分は受け取り済みです。また明日！</p>
        )}
      </CardContent>
    </Card>
  );
}
