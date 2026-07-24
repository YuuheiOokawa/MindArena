import type { ReactNode } from "react";

/**
 * Caps the app at a phone-sized column and centers it on wider viewports (source spec §4 —
 * never render a full-bleed desktop layout). Safe-area padding is applied here once instead
 * of in every screen.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-arena-bg">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-arena-bg pt-[env(safe-area-inset-top)]">
        {children}
      </div>
    </div>
  );
}
