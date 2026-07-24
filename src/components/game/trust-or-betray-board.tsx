import { ChoiceButton } from "./choice-button";

export function TrustOrBetrayBoard({
  myId,
  pendingActions,
  submitting,
  onChoose,
}: {
  myId: string;
  pendingActions: Record<string, unknown>;
  submitting: boolean;
  onChoose: (choice: "TRUST" | "BETRAY") => void;
}) {
  const iHaveActed = Boolean(pendingActions?.[myId]);

  if (iHaveActed) {
    return <WaitingBanner />;
  }

  return (
    <div className="flex gap-3">
      <ChoiceButton label="信頼" description="協調して得点を分け合う" disabled={submitting} onClick={() => onChoose("TRUST")} />
      <ChoiceButton label="裏切り" description="出し抜いて高得点を狙う" disabled={submitting} onClick={() => onChoose("BETRAY")} />
    </div>
  );
}

export function WaitingBanner() {
  return (
    <div className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-arena-primary/30 bg-arena-primary/5 text-sm text-arena-silver">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-arena-primary-soft"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      相手が考え中…
    </div>
  );
}
