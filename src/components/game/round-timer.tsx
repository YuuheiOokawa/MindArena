"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { TIMER_URGENT_THRESHOLD_SECONDS } from "@/config/timers";

/**
 * Visual countdown that fires onExpire once. The caller should pass `key={resetKey}` on this
 * component so a new round/phase remounts it with a fresh countdown instead of trying to
 * reset internal state from an effect.
 */
export function RoundTimer({ seconds, onExpire }: { seconds: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const urgent = remaining <= TIMER_URGENT_THRESHOLD_SECONDS;

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold tabular-nums",
        urgent ? "border-arena-danger text-arena-danger animate-pulse" : "border-arena-border text-arena-silver",
      )}
    >
      {remaining}
    </div>
  );
}
