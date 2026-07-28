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
