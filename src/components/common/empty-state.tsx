import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-arena-border px-6 py-12 text-center">
      <Icon className="mb-1 h-8 w-8 text-arena-silver/60" />
      <p className="text-sm font-medium text-arena-silver">{title}</p>
      {description && <p className="text-xs text-arena-silver/60">{description}</p>}
    </div>
  );
}
