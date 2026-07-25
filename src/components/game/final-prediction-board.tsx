import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";
import { FINAL_PREDICTION_MOVE_LABELS as MOVE_LABELS, type FinalPredictionMove } from "@/config/games/final-prediction";

interface DeclareEntry {
  actionData: { move: FinalPredictionMove };
}

export function FinalPredictionBoard({
  myId,
  opponentId,
  phase,
  declarations,
  pendingActions,
  submitting,
  onDeclare,
  onChoose,
}: {
  myId: string;
  opponentId: string;
  phase: "DECLARE" | "CHOOSE";
  declarations: Record<string, DeclareEntry>;
  pendingActions: Record<string, unknown>;
  submitting: boolean;
  onDeclare: (move: FinalPredictionMove) => void;
  onChoose: (move: FinalPredictionMove) => void;
}) {
  const moveButtons = (onPick: (move: FinalPredictionMove) => void) => (
    <div className="flex flex-col gap-2">
      {(Object.keys(MOVE_LABELS) as FinalPredictionMove[]).map((move) => (
        <ChoiceButton
          key={move}
          label={MOVE_LABELS[move].label}
          description={MOVE_LABELS[move].description}
          disabled={submitting}
          onClick={() => onPick(move)}
        />
      ))}
    </div>
  );

  if (phase === "DECLARE") {
    if (declarations?.[myId]) return <WaitingBanner />;

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-arena-silver">どの手を出すか宣言する（本当でも嘘でもよい）</p>
        {moveButtons(onDeclare)}
      </div>
    );
  }

  // CHOOSE phase — the final, locked-in move. Free to match or diverge from the declaration.
  if (pendingActions?.[myId]) return <WaitingBanner />;

  const opponentDeclaration = declarations?.[opponentId]?.actionData.move;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-arena-border bg-arena-surface-2 px-4 py-3">
        <p className="text-xs text-arena-silver">相手の宣言</p>
        <p className="mt-1 text-base font-semibold text-arena-white">
          {opponentDeclaration ? MOVE_LABELS[opponentDeclaration].label : "…"}
        </p>
      </div>
      <p className="text-xs font-medium text-arena-silver">最終的な手をロックインする</p>
      {moveButtons(onChoose)}
    </div>
  );
}
