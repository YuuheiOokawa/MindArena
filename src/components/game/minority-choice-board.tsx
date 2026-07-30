import { Users } from "lucide-react";
import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";

interface DeclareEntry {
  actionData: { choice: "A" | "B" };
}

interface CrowdPreviewData {
  revealedA: number;
  revealedB: number;
  hiddenCount: number;
}

/** The published portion of this round's crowd vote — the shared information both players are
 * reasoning from. Sessions started before the preview existed simply don't render it. */
function CrowdSurveyPanel({ preview }: { preview: CrowdPreviewData }) {
  const total = preview.revealedA + preview.revealedB;
  const aRatio = total > 0 ? (preview.revealedA / total) * 100 : 50;
  return (
    <div className="rounded-xl border border-arena-primary/25 bg-arena-primary/5 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-arena-primary-soft">
        <Users className="h-3.5 w-3.5" />
        観客の事前公開票
      </p>
      <div className="mt-2 flex items-center justify-between text-sm font-bold tabular-nums">
        <span className="text-arena-white">A: {preview.revealedA}票</span>
        <span className="text-arena-white">B: {preview.revealedB}票</span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-arena-surface-2">
        <div className="bg-arena-primary/70" style={{ width: `${aRatio}%` }} />
        <div className="flex-1 bg-arena-gold/60" />
      </div>
      <p className="mt-1.5 text-[11px] text-arena-silver/70">
        残り{preview.hiddenCount}票は非公開。あなたと相手の1票ずつも加算され、最終的に少ない側だけが得点する。
      </p>
    </div>
  );
}

export function MinorityChoiceBoard({
  myId,
  opponentId,
  phase,
  declarations,
  pendingActions,
  crowdPreview,
  submitting,
  onDeclare,
  onChoose,
}: {
  myId: string;
  opponentId: string;
  phase: "DECLARE" | "CHOOSE";
  declarations: Record<string, DeclareEntry>;
  pendingActions: Record<string, unknown>;
  crowdPreview?: CrowdPreviewData | null;
  submitting: boolean;
  onDeclare: (choice: "A" | "B") => void;
  onChoose: (choice: "A" | "B") => void;
}) {
  if (phase === "DECLARE") {
    if (declarations?.[myId]) return <WaitingBanner />;

    return (
      <div className="flex flex-col gap-3">
        {crowdPreview && <CrowdSurveyPanel preview={crowdPreview} />}
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
      {crowdPreview && <CrowdSurveyPanel preview={crowdPreview} />}
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
