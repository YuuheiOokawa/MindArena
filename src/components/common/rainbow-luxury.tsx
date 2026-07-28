import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Mind King exclusive presentation — see config/league-visuals.ts's `rainbow` flag and
 * globals.css's `arena-rainbow-*` classes. `rounded` must match the wrapped child's own corner
 * radius (e.g. "rounded-2xl" for a card, "rounded-full" for an avatar) so the spinning ring reads
 * as a clean border instead of a mismatched outline. `active=false` renders children unwrapped so
 * callers can leave this in the tree unconditionally instead of branching their whole card JSX.
 */
export function RainbowLuxuryFrame({
  active = true,
  rounded,
  halo = true,
  children,
  className,
}: {
  active?: boolean;
  rounded: string;
  halo?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!active) return <>{children}</>;
  return (
    <div
      className={cn("relative arena-rainbow-ring p-[2px]", rounded, className)}
    >
      {halo && (
        <div className={cn("arena-rainbow-halo", rounded)} aria-hidden />
      )}
      {children}
    </div>
  );
}

const SPARKLE_POSITIONS = [
  { top: "8%", left: "10%", delay: "0s" },
  { top: "18%", left: "88%", delay: "0.5s" },
  { top: "68%", left: "94%", delay: "1s" },
  { top: "88%", left: "18%", delay: "1.5s" },
  { top: "45%", left: "48%", delay: "2s" },
];

/** A handful of twinkling sparkles overlaid on a `relative` ancestor — pair with
 * RainbowLuxuryFrame for the full Mind King card treatment. */
export function RainbowSparkles() {
  return (
    <>
      {SPARKLE_POSITIONS.map((pos, i) => (
        <Sparkles
          key={i}
          aria-hidden
          className="arena-sparkle-piece pointer-events-none h-4 w-4"
          style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }}
        />
      ))}
    </>
  );
}
