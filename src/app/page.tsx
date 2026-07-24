"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { APP_CONFIG } from "@/config/app";

export default function SplashPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const timer = setTimeout(() => {
      router.replace(status === "authenticated" ? "/home" : "/login");
    }, 700);
    return () => clearTimeout(timer);
  }, [status, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-arena-gold/40 bg-arena-gold/10">
          <span className="text-2xl font-bold text-arena-gold">M</span>
        </div>
        <h1 className="text-2xl font-bold tracking-[0.2em] text-arena-white">{APP_CONFIG.title}</h1>
        <p className="text-sm text-arena-silver">{APP_CONFIG.tagline}</p>
      </div>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-arena-border border-t-arena-gold" />
    </div>
  );
}
