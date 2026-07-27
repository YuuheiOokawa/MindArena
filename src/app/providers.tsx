"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { PreferencesProvider } from "@/components/providers/preferences-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </SessionProvider>
  );
}
