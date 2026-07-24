import { cn } from "@/lib/utils/cn";

export function LoadingState({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-arena-border border-t-arena-primary" />
      <p className="text-xs text-arena-silver/70">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-arena-surface-2", className)} />;
}
