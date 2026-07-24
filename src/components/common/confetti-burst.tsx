const COLORS = ["var(--color-arena-gold)", "var(--color-arena-primary)", "var(--color-arena-primary-soft)", "var(--color-arena-gold-soft)"];

/**
 * Deterministic (no Math.random — this renders during SSR too, and a random seed would mismatch
 * on hydration) confetti burst for the win/champion reveal. `count` pieces are spread evenly
 * across the width with pseudo-varied timing/drift derived from their own index.
 */
export function ConfettiBurst({ count = 20 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 37) % 100) + (i % 2 === 0 ? 2 : -2);
        const drift = ((i * 53) % 60) - 30;
        const spin = 280 + ((i * 71) % 200);
        const duration = 1.1 + ((i * 13) % 60) / 100;
        const delay = ((i * 29) % 50) / 100;
        return (
          <span
            key={i}
            className="arena-confetti-piece"
            style={
              {
                "--arena-confetti-left": `${left}%`,
                "--arena-confetti-drift": `${drift}px`,
                "--arena-confetti-spin": `${spin}deg`,
                "--arena-confetti-duration": `${duration}s`,
                "--arena-confetti-delay": `${delay}s`,
                "--arena-confetti-color": COLORS[i % COLORS.length],
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
