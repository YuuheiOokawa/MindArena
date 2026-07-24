import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";

const MOVE_LABELS: Record<string, { label: string; description: string }> = {
  STRIKE: { label: "攻撃", description: "見破るに勝つ" },
  GUARD: { label: "防御", description: "攻撃に勝つ" },
  READ: { label: "見破る", description: "防御に勝つ" },
};

export function FinalPredictionBoard({
  myId,
  pendingActions,
  submitting,
  onChoose,
}: {
  myId: string;
  pendingActions: Record<string, unknown>;
  submitting: boolean;
  onChoose: (move: "STRIKE" | "GUARD" | "READ") => void;
}) {
  if (pendingActions?.[myId]) return <WaitingBanner />;

  return (
    <div className="flex flex-col gap-2">
      {(Object.keys(MOVE_LABELS) as Array<keyof typeof MOVE_LABELS>).map((move) => (
        <ChoiceButton
          key={move}
          label={MOVE_LABELS[move].label}
          description={MOVE_LABELS[move].description}
          disabled={submitting}
          onClick={() => onChoose(move as "STRIKE" | "GUARD" | "READ")}
        />
      ))}
    </div>
  );
}
