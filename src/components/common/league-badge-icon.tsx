import Image from "next/image";
import { Gem } from "lucide-react";
import { getLeagueBadgeColor, getLeagueBadgeIcon } from "@/config/league-visuals";
import { cn } from "@/lib/utils/cn";

/** Renders a league's real badge artwork (see public/leagues/), falling back to a tinted Gem
 * icon for any theme key that doesn't have artwork yet. */
export function LeagueBadgeIcon({ themeKey, className }: { themeKey: string; className?: string }) {
  const icon = getLeagueBadgeIcon(themeKey);
  if (!icon) return <Gem className={cn("h-3 w-3", getLeagueBadgeColor(themeKey), className)} />;
  return (
    <Image
      src={icon}
      alt=""
      width={64}
      height={64}
      unoptimized
      className={cn("h-4 w-4 shrink-0 object-contain drop-shadow-sm", className)}
    />
  );
}
