import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";

interface DeclareEntry {
  actionData: { choice: "A" | "B" };
}

export function MinorityChoiceBoard({
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
  onDeclare: (choice: "A" | "B") => void;
  onChoose: (choice: "A" | "B") => void;
}) {
  if (phase === "DECLARE") {
    if (declarations?.[myId]) return <WaitingBanner />;

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-arena-silver">どちらを選ぶか宣言する（本当でも嘘でもよい）</p>
        <div className="flex gap-3">
          <ChoiceButton label="A" description="Aの少数派を狙う" disabled={submitting} onClick={() => onDeclare("A")} />
          <ChoiceButton label="B" description="Bの少数派を狙う" disabled={submitting} onClick={() => onDeclare("B")} />
        </div>
      </div>
    );
  }

  // CHOOSE phase — the final, locked-in pick. Free to match or diverge from the declaration.
  if (pendingActions?.[myId]) return <WaitingBanner />;

  const opponentDeclaration = declarations?.[opponentId]?.actionData.choice;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-arena-border bg-arena-surface-2 px-4 py-3">
        <p className="text-xs text-arena-silver">相手の宣言</p>
        <p className="mt-1 text-base font-semibold text-arena-white">
          {opponentDeclaration ? `${opponentDeclaration}の少数派を狙う` : "…"}
        </p>
      </div>
      <p className="text-xs font-medium text-arena-silver">最終的な選択をロックインする</p>
      <div className="flex gap-3">
        <ChoiceButton label="A" description="Aの少数派を狙う" disabled={submitting} onClick={() => onChoose("A")} />
        <ChoiceButton label="B" description="Bの少数派を狙う" disabled={submitting} onClick={() => onChoose("B")} />
      </div>
    </div>
  );
}
