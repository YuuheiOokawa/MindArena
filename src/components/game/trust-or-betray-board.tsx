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
    <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-arena-border text-sm text-arena-silver">
      相手の選択を待っています…
    </div>
  );
}
