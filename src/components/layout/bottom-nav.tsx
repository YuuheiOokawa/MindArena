"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Swords, Sofa, History, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/leagues", label: "リーグ", icon: Layers },
  { href: "/tournaments/join", label: "トーナメント", icon: Swords },
  { href: "/room", label: "部屋", icon: Sofa },
  { href: "/history", label: "戦績", icon: History },
  { href: "/profile", label: "プロフィール", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-arena-border bg-arena-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="flex items-stretch justify-between px-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[9.5px] font-medium transition-colors",
                  active ? "text-arena-primary-soft" : "text-arena-silver/70 hover:text-arena-silver",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-arena-primary/15",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
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
