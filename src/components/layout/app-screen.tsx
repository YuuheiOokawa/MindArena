import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Every screen composes this instead of deciding nav visibility itself — the source spec's
 * "hide bottom nav during focus moments" rule lives in ONE place (nav defaults to false).
 */
export function AppScreen({
  children,
  nav = false,
  header,
  className = "",
}: {
  children: ReactNode;
  nav?: boolean;
  header?: ReactNode;
  className?: string;
}) {
  return (
    <>
      {header}
      <main className={`no-scrollbar flex-1 overflow-y-auto ${className}`}>{children}</main>
      {nav && <BottomNav />}
    </>
  );
}
