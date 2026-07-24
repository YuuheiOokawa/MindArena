import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";

export function MinorityChoiceBoard({
  myId,
  pendingActions,
  submitting,
  onChoose,
}: {
  myId: string;
  pendingActions: Record<string, unknown>;
  submitting: boolean;
  onChoose: (choice: "A" | "B") => void;
}) {
  if (pendingActions?.[myId]) return <WaitingBanner />;

  return (
    <div className="flex gap-3">
      <ChoiceButton label="A" description="Aの少数派を狙う" disabled={submitting} onClick={() => onChoose("A")} />
      <ChoiceButton label="B" description="Bの少数派を狙う" disabled={submitting} onClick={() => onChoose("B")} />
    </div>
  );
}
