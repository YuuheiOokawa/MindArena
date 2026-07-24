import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** Header used on "focus mode" screens (no bottom nav) — matchmaking, game, results, championship. */
export function FocusHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-arena-border px-2">
      {backHref ? (
        <Link href={backHref} className="flex h-11 w-11 items-center justify-center rounded-full text-arena-silver hover:text-arena-white">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <div className="w-11" />
      )}
      <p className="flex-1 truncate text-center text-sm font-semibold tracking-wide text-arena-white">{title}</p>
      <div className="w-11" />
    </header>
  );
}
