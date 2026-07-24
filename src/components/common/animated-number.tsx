"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` on mount/change. Snaps straight to the final value under prefers-reduced-motion. */
export function AnimatedNumber({ value, durationMs = 700 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 1 : durationMs;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / effectiveDuration);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs]);

  return <>{display.toLocaleString()}</>;
}
