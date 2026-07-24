import { cn } from "@/lib/utils/cn";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-arena-surface-2", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-arena-gold/70 to-arena-gold transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
