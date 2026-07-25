"use client";

import { useState } from "react";
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

/** Renders the player's avatar: an uploaded photo if set, else their selected icon, else their
 * name's first letter as a fallback (also covers other players whose selection isn't wired
 * through every read path yet). A photo always takes priority over an icon selection. */
export function PlayerAvatar({
  displayName,
  avatarIconId,
  photoUrl,
  className,
  iconClassName,
}: {
  displayName: string;
  avatarIconId?: string | null;
  photoUrl?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const avatar = getAvatarIcon(avatarIconId);
  const Icon = avatar ? AVATAR_ICON_COMPONENTS[avatar.icon] : null;
  const [photoFailed, setPhotoFailed] = useState(false);
  // Reset the failure flag when a different photoUrl comes in (e.g. the profile edit page
  // swapping between an uploaded photo and an icon and back) — adjusting state during render
  // rather than in a useEffect, per this repo's react-hooks/set-state-in-effect convention.
  const [trackedPhotoUrl, setTrackedPhotoUrl] = useState(photoUrl);
  if (photoUrl !== trackedPhotoUrl) {
    setTrackedPhotoUrl(photoUrl);
    setPhotoFailed(false);
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-arena-primary/50 bg-arena-surface-2 font-bold text-arena-primary-soft",
        className,
      )}
    >
      {photoUrl && !photoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data: URI, not an optimizable static asset
        <img src={photoUrl} alt="" className="h-full w-full object-cover" onError={() => setPhotoFailed(true)} />
      ) : Icon ? (
        <Icon className={cn(avatar!.colorClass, iconClassName ?? "h-6 w-6")} />
      ) : (
        displayName.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}
