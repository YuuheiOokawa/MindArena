import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { MobileShell } from "@/components/layout/mobile-shell";
import { APP_CONFIG } from "@/config/app";

export const metadata: Metadata = {
  title: APP_CONFIG.title,
  description: APP_CONFIG.tagline,
};

// maximumScale/userScalable are deliberately left at their default (unrestricted) — locking
// pinch-zoom fails WCAG 1.4.4 (Resize Text) and blocks low-vision users from using the app at
// all, which is a harder failure than any layout wobble zooming might cause.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-dvh flex-col bg-arena-bg text-arena-white">
        <Providers>
          <MobileShell>{children}</MobileShell>
        </Providers>
      </body>
    </html>
  );
}
