import { ChoiceButton } from "./choice-button";

interface DeclareEntry {
  actionData: { choice: "TRUST" | "BETRAY" };
}

export function TrustOrBetrayBoard({
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
  onDeclare: (choice: "TRUST" | "BETRAY") => void;
  onChoose: (choice: "TRUST" | "BETRAY") => void;
}) {
  if (phase === "DECLARE") {
    if (declarations?.[myId]) return <WaitingBanner />;

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-arena-silver">どちらを選ぶか宣言する（本当でも嘘でもよい）</p>
        <div className="flex gap-3">
          <ChoiceButton label="信頼" description="協調して得点を分け合う" disabled={submitting} onClick={() => onDeclare("TRUST")} />
          <ChoiceButton label="裏切り" description="出し抜いて高得点を狙う" disabled={submitting} onClick={() => onDeclare("BETRAY")} />
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
          {opponentDeclaration === "TRUST" ? "信頼する" : opponentDeclaration === "BETRAY" ? "裏切る" : "…"}
        </p>
      </div>
      <p className="text-xs font-medium text-arena-silver">最終的な選択をロックインする</p>
      <div className="flex gap-3">
        <ChoiceButton label="信頼" description="協調して得点を分け合う" disabled={submitting} onClick={() => onChoose("TRUST")} />
        <ChoiceButton label="裏切り" description="出し抜いて高得点を狙う" disabled={submitting} onClick={() => onChoose("BETRAY")} />
      </div>
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
