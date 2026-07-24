"use client";

import { useState } from "react";
import { NUMBER_BLUFF_DECLARATIONS, type NumberBluffDeclarationId } from "@/config/games/number-bluff";
import { ChoiceButton } from "./choice-button";
import { WaitingBanner } from "./trust-or-betray-board";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface DeclareAction {
  actionData: { number: number; declarationId: NumberBluffDeclarationId };
}

export function NumberBluffBoard({
  myId,
  opponentId,
  phase,
  pendingDeclarations,
  pendingResponses,
  submitting,
  onDeclare,
  onRespond,
}: {
  myId: string;
  opponentId: string;
  phase: "DECLARE" | "RESPOND";
  pendingDeclarations: Record<string, DeclareAction>;
  pendingResponses: Record<string, unknown>;
  submitting: boolean;
  onDeclare: (number: number, declarationId: NumberBluffDeclarationId) => void;
  onRespond: (believe: boolean) => void;
}) {
  const [number, setNumber] = useState<number | null>(null);
  const [declarationId, setDeclarationId] = useState<NumberBluffDeclarationId | null>(null);

  if (phase === "DECLARE") {
    if (pendingDeclarations?.[myId]) return <WaitingBanner />;

    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-arena-silver">数字を選ぶ（1〜9）</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setNumber(n)}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                number === n ? "border-arena-gold bg-arena-gold/15 text-arena-gold" : "border-arena-border text-arena-silver",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="mt-1 text-xs font-medium text-arena-silver">宣言を選ぶ（本当でも嘘でもよい）</p>
        <div className="flex flex-col gap-2">
          {NUMBER_BLUFF_DECLARATIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeclarationId(d.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                declarationId === d.id ? "border-arena-gold bg-arena-gold/10 text-arena-white" : "border-arena-border text-arena-silver",
              )}
            >
              {d.text}
            </button>
          ))}
        </div>

        <Button
          disabled={number === null || declarationId === null || submitting}
          onClick={() => number !== null && declarationId && onDeclare(number, declarationId)}
        >
          宣言する
        </Button>
      </div>
    );
  }

  // RESPOND phase
  if (pendingResponses?.[myId]) return <WaitingBanner />;

  const opponentDeclaration = pendingDeclarations?.[opponentId];
  const declarationText = opponentDeclaration
    ? NUMBER_BLUFF_DECLARATIONS.find((d) => d.id === opponentDeclaration.actionData.declarationId)?.text
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-arena-border bg-arena-surface-2 px-4 py-3">
        <p className="text-xs text-arena-silver">相手の宣言</p>
        <p className="mt-1 text-base font-semibold text-arena-white">
          {declarationText ?? "…"} （数字: {opponentDeclaration?.actionData.number ?? "?"}）
        </p>
      </div>
      <div className="flex gap-3">
        <ChoiceButton label="信じる" disabled={submitting} onClick={() => onRespond(true)} />
        <ChoiceButton label="疑う" disabled={submitting} onClick={() => onRespond(false)} />
      </div>
    </div>
  );
}
