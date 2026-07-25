interface TrendPoint {
  date: string;
  winRate: number;
}

const WIDTH = 320;
const HEIGHT = 96;
const PADDING_X = 4;
const PADDING_Y = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Hand-rolled SVG line chart — no charting library in this repo, and a handful of points on a
 * fixed 0-100 scale doesn't need one. */
export function WinRateTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-arena-border text-xs text-arena-silver/60">
        対戦を重ねると推移が表示されます
      </div>
    );
  }

  const usableWidth = WIDTH - PADDING_X * 2;
  const usableHeight = HEIGHT - PADDING_Y * 2;
  const points = data.map((point, i) => {
    const x = PADDING_X + (i / (data.length - 1)) * usableWidth;
    const y = PADDING_Y + (1 - point.winRate / 100) * usableHeight;
    return { x, y, ...point };
  });
  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `${PADDING_X},${PADDING_Y + usableHeight} ${linePath} ${PADDING_X + usableWidth},${PADDING_Y + usableHeight}`;

  return (
    <div className="rounded-xl border border-arena-border bg-arena-surface-2/60 px-3 pb-2 pt-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-24 w-full" preserveAspectRatio="none">
        {[0, 50, 100].map((tick) => {
          const y = PADDING_Y + (1 - tick / 100) * usableHeight;
          return (
            <line
              key={tick}
              x1={PADDING_X}
              y1={y}
              x2={WIDTH - PADDING_X}
              y2={y}
              stroke="var(--color-arena-border)"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "3 3"}
            />
          );
        })}
        <polygon points={areaPath} fill="var(--color-arena-primary)" opacity={0.12} />
        <polyline points={linePath} fill="none" stroke="var(--color-arena-primary-soft)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--color-arena-primary-soft)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-arena-silver/60">
        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 4) === 0)
          .map((p, i) => (
            <span key={i}>{formatDate(p.date)}</span>
          ))}
      </div>
    </div>
  );
}
