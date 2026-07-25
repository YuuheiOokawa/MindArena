import { Brain, Eye, Ghost, Skull, Crown, Flame, Zap, Swords, Shield, Moon, Star, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAvatarIcon } from "@/config/avatar-icons";
import { cn } from "@/lib/utils/cn";

const AVATAR_ICON_COMPONENTS: Record<string, LucideIcon> = {
  Brain,
  Eye,
  Ghost,
  Skull,
  Crown,
  Flame,
  Zap,
  Swords,
  Shield,
  Moon,
  Star,
  Sparkles,
};

/** Renders the player's selected icon avatar, falling back to their name's first letter when
 * none is set (or for other players, whose selection isn't wired through every read path yet). */
export function PlayerAvatar({
  displayName,
  avatarIconId,
  className,
  iconClassName,
}: {
  displayName: string;
  avatarIconId?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const avatar = getAvatarIcon(avatarIconId);
  const Icon = avatar ? AVATAR_ICON_COMPONENTS[avatar.icon] : null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 border-arena-primary/50 bg-arena-surface-2 font-bold text-arena-primary-soft",
        className,
      )}
    >
      {Icon ? <Icon className={cn(avatar!.colorClass, iconClassName ?? "h-6 w-6")} /> : displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}
