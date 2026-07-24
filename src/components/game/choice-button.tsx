import { cn } from "@/lib/utils/cn";

export function ChoiceButton({
  label,
  description,
  disabled,
  onClick,
}: {
  label: string;
  description?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-16 flex-1 rounded-xl border border-arena-border bg-arena-surface-2 px-4 py-3 text-left transition-all",
        "active:scale-[0.97] disabled:opacity-40",
        "hover:border-arena-gold/50",
      )}
    >
      <p className="text-base font-semibold text-arena-white">{label}</p>
      {description && <p className="mt-0.5 text-xs text-arena-silver">{description}</p>}
    </button>
  );
}
