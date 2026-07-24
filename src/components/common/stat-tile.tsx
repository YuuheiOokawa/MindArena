export function StatTile({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-arena-border bg-arena-surface-2/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-arena-silver/70">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${accent ? "text-arena-gold" : "text-arena-white"}`}>{value}</p>
    </div>
  );
}
