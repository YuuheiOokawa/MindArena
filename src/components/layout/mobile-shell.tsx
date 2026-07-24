import type { ReactNode } from "react";

/**
 * Caps the app at a phone-sized column and centers it on wider viewports (source spec §4 —
 * never render a full-bleed desktop layout). Safe-area padding is applied here once instead
 * of in every screen.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="arena-ambient-bg flex min-h-dvh justify-center">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        {children}
      </div>
    </div>
  );
}
