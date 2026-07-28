"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Sofa, History, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// リーグ一覧(/leagues)からリーグ詳細でそのままトーナメントに参加できるため、
// 以前あった「トーナメント」タブ(/tournaments/join)は「リーグ」タブに統合済み。
const NAV_ITEMS = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/leagues", label: "リーグ", icon: Layers },
  { href: "/room", label: "部屋", icon: Sofa },
  { href: "/history", label: "戦績", icon: History },
  { href: "/profile", label: "プロフィール", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-arena-border bg-arena-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-arena-primary-soft" : "text-arena-silver/70 hover:text-arena-silver",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                    active && "bg-arena-primary/15",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
