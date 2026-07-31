"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Shared shell for the static legal pages (/legal/terms, /legal/privacy, /legal/tokushoho).
 * These are reachable both pre-login (from the register page) and post-login (from Settings),
 * so the back action uses router.back() rather than a fixed href. */
export function LegalDocument({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-arena-border px-2">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="flex h-11 w-11 items-center justify-center rounded-full text-arena-silver hover:text-arena-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate text-center text-sm font-semibold tracking-wide text-arena-white">{title}</p>
        <div className="w-11" />
      </header>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-5">
        <div className="flex flex-col gap-5 text-[13px] leading-relaxed text-arena-silver [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-arena-white [&_p]:mt-1.5 [&_ol]:mt-1.5 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:pl-5 [&_table]:mt-1.5 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-arena-border [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top [&_td]:break-words">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
