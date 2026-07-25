import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { NUMBER_BLUFF_DECLARATIONS, isDeclarationTrue, type NumberBluffDeclarationId } from "@/config/games/number-bluff";
import { FINAL_PREDICTION_MOVE_LABELS, FINAL_PREDICTION_BEATS, type FinalPredictionMove } from "@/config/games/final-prediction";
import { Handshake, Swords, Shield, Zap, Eye, Users, Check, X } from "lucide-react";

interface RoundEntry {
  round: number;
  actions: Record<string, { actionData: Record<string, unknown> }>;
  responses?: Record<string, { actionData: Record<string, unknown> }>;
  declarations?: Record<string, { actionData: Record<string, unknown> }>;
  outcome?: Record<string, number>;
}

interface RoundRevealProps {
  state: Record<string, unknown>;
  entry: RoundEntry;
  myId: string;
  opponentId: string;
  isFinalRound: boolean;
  onContinue: () => void;
}

/** The one place that switches on gameId to pick a reveal body — mirrors GameBoard's dispatch pattern. */
export function RoundReveal({ state, entry, myId, opponentId, isFinalRound, onContinue }: RoundRevealProps) {
  const gameId = state.gameId as string;

  return (
    <RevealShell entry={entry} myId={myId} opponentId={opponentId} isFinalRound={isFinalRound} onContinue={onContinue}>
      {gameId === "trust-or-betray" && <TrustOrBetrayReveal entry={entry} myId={myId} opponentId={opponentId} />}
      {gameId === "number-bluff" && <NumberBluffReveal entry={entry} myId={myId} opponentId={opponentId} />}
      {gameId === "minority-choice" && <MinorityChoiceReveal state={state} entry={entry} myId={myId} opponentId={opponentId} />}
      {gameId === "final-prediction" && <FinalPredictionReveal entry={entry} myId={myId} opponentId={opponentId} />}
    </RevealShell>
  );
}

function RevealShell({
  entry,
  myId,
  opponentId,
  isFinalRound,
  onContinue,
  children,
}: {
  entry: RoundEntry;
  myId: string;
  opponentId: string;
  isFinalRound: boolean;
  onContinue: () => void;
  children: ReactNode;
}) {
  const myScore = entry.outcome?.[myId] ?? 0;
  const oppScore = entry.outcome?.[opponentId] ?? 0;
  const result: "WIN" | "LOSE" | "DRAW" = myScore > oppScore ? "WIN" : myScore < oppScore ? "LOSE" : "DRAW";

  return (
    <div className="arena-pop-in flex flex-col gap-4 rounded-2xl border border-arena-border bg-arena-surface-2/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-arena-primary-soft">ROUND {entry.round} 結果</p>
        <Badge variant={result === "WIN" ? "success" : result === "LOSE" ? "danger" : "neutral"}>{result}</Badge>
      </div>

      {children}

      <div className="flex items-center justify-center gap-1.5 text-sm">
        <span className={cn("font-bold tabular-nums", myScore > 0 ? "text-arena-success" : myScore < 0 ? "text-arena-danger" : "text-arena-silver")}>
          {myScore >= 0 ? `+${myScore}` : myScore}
        </span>
        <span className="text-arena-silver/60">pt</span>
      </div>

      <Button variant="gold" onClick={onContinue}>
        {isFinalRound ? "結果を見る" : "次のラウンドへ"}
      </Button>
    </div>
  );
}

function SideBySide({
  myLabel,
  oppLabel,
  myIcon,
  oppIcon,
}: {
  myLabel: ReactNode;
  oppLabel: ReactNode;
  myIcon: ReactNode;
  oppIcon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-around gap-3">
      <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
        <p className="text-[10px] text-arena-silver/70">あなた</p>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-arena-primary/40 bg-arena-primary/10 text-arena-primary-soft">
          {myIcon}
        </div>
        <div className="text-xs text-arena-white">{myLabel}</div>
      </div>
      <span className="text-[10px] font-black text-arena-silver/40">VS</span>
      <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
        <p className="text-[10px] text-arena-silver/70">相手</p>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-arena-border bg-arena-surface-2 text-arena-silver">
          {oppIcon}
        </div>
        <div className="text-xs text-arena-white">{oppLabel}</div>
      </div>
    </div>
  );
}

function TrustOrBetrayReveal({ entry, myId, opponentId }: { entry: RoundEntry; myId: string; opponentId: string }) {
  const myChoice = entry.actions[myId]?.actionData?.choice as "TRUST" | "BETRAY" | undefined;
  const oppChoice = entry.actions[opponentId]?.actionData?.choice as "TRUST" | "BETRAY" | undefined;

  const narrative =
    myChoice === "TRUST" && oppChoice === "TRUST"
      ? "お互いに信頼を選びました。"
      : myChoice === "BETRAY" && oppChoice === "BETRAY"
        ? "お互いに裏切りを選びました。"
        : myChoice === "TRUST"
          ? "あなたは信頼を選び、相手に裏切られました。"
          : "あなたは裏切り、相手を出し抜きました。";

  return (
    <>
      <SideBySide
        myLabel={myChoice === "TRUST" ? "信頼" : "裏切り"}
        oppLabel={oppChoice === "TRUST" ? "信頼" : "裏切り"}
        myIcon={myChoice === "TRUST" ? <Handshake className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
        oppIcon={oppChoice === "TRUST" ? <Handshake className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
      />
      <p className="text-center text-xs text-arena-silver">{narrative}</p>
    </>
  );
}

function NumberBluffReveal({ entry, myId, opponentId }: { entry: RoundEntry; myId: string; opponentId: string }) {
  const myDeclare = entry.actions[myId]?.actionData as { number: number; declarationId: NumberBluffDeclarationId } | undefined;
  const oppDeclare = entry.actions[opponentId]?.actionData as { number: number; declarationId: NumberBluffDeclarationId } | undefined;
  const myRespond = entry.responses?.[myId]?.actionData as { believe: boolean } | undefined;
  const oppRespond = entry.responses?.[opponentId]?.actionData as { believe: boolean } | undefined;

  if (!myDeclare || !oppDeclare) return null;

  const myDeclarationText = NUMBER_BLUFF_DECLARATIONS.find((d) => d.id === myDeclare.declarationId)?.text;
  const oppDeclarationText = NUMBER_BLUFF_DECLARATIONS.find((d) => d.id === oppDeclare.declarationId)?.text;
  const myDeclarationTrue = isDeclarationTrue(myDeclare.declarationId, myDeclare.number, oppDeclare.number);
  const oppDeclarationTrue = isDeclarationTrue(oppDeclare.declarationId, oppDeclare.number, myDeclare.number);

  return (
    <div className="flex flex-col gap-3">
      <NumberBluffPlayerRow
        label="あなた"
        number={myDeclare.number}
        declarationText={myDeclarationText}
        declarationTrue={myDeclarationTrue}
      />
      <NumberBluffPlayerRow
        label="相手"
        number={oppDeclare.number}
        declarationText={oppDeclarationText}
        declarationTrue={oppDeclarationTrue}
      />
      {myRespond && (
        <p className="text-center text-xs text-arena-silver">
          あなたは相手の宣言を「{myRespond.believe ? "信じた" : "疑った"}」
          <span className={myRespond.believe === oppDeclarationTrue ? "text-arena-success" : "text-arena-danger"}>
            {myRespond.believe === oppDeclarationTrue ? "（正解）" : "（不正解）"}
          </span>
        </p>
      )}
      {oppRespond && (
        <p className="text-center text-xs text-arena-silver">
          相手はあなたの宣言を「{oppRespond.believe ? "信じた" : "疑った"}」
          <span className={oppRespond.believe === myDeclarationTrue ? "text-arena-success" : "text-arena-danger"}>
            {oppRespond.believe === myDeclarationTrue ? "（正解）" : "（不正解）"}
          </span>
        </p>
      )}
    </div>
  );
}

function NumberBluffPlayerRow({
  label,
  number,
  declarationText,
  declarationTrue,
}: {
  label: string;
  number: number;
  declarationText?: string;
  declarationTrue: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-arena-border bg-arena-surface-2 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] text-arena-silver/70">{label}</p>
        <p className="text-xs text-arena-white">
          数字: <span className="font-bold tabular-nums">{number}</span>
        </p>
        <p className="truncate text-[11px] text-arena-silver">{declarationText}</p>
      </div>
      <Badge variant={declarationTrue ? "success" : "danger"} className="shrink-0">
        {declarationTrue ? (
          <>
            <Check className="h-3 w-3" />本当
          </>
        ) : (
          <>
            <X className="h-3 w-3" />
            嘘
          </>
        )}
      </Badge>
    </div>
  );
}

function MinorityChoiceReveal({
  state,
  entry,
  myId,
  opponentId,
}: {
  state: Record<string, unknown>;
  entry: RoundEntry;
  myId: string;
  opponentId: string;
}) {
  const myChoice = entry.actions[myId]?.actionData?.choice as "A" | "B" | undefined;
  const oppChoice = entry.actions[opponentId]?.actionData?.choice as "A" | "B" | undefined;
  const myDeclared = entry.declarations?.[myId]?.actionData?.choice as "A" | "B" | undefined;
  const oppDeclared = entry.declarations?.[opponentId]?.actionData?.choice as "A" | "B" | undefined;
  const crowdByRound = state.crowdByRound as Record<number, { aCount: number; bCount: number }> | undefined;
  const crowd = crowdByRound?.[entry.round] ?? { aCount: 0, bCount: 0 };

  const totalA = crowd.aCount + (myChoice === "A" ? 1 : 0) + (oppChoice === "A" ? 1 : 0);
  const totalB = crowd.bCount + (myChoice === "B" ? 1 : 0) + (oppChoice === "B" ? 1 : 0);
  const total = totalA + totalB || 1;
  const minoritySide = totalA === totalB ? null : totalA < totalB ? "A" : "B";
  const oppBluffed = oppDeclared && oppChoice && oppDeclared !== oppChoice;
  const iBluffed = myDeclared && myChoice && myDeclared !== myChoice;

  return (
    <div className="flex flex-col gap-3">
      <SideBySide
        myLabel={myChoice}
        oppLabel={oppChoice}
        myIcon={<span className="text-sm font-bold">{myChoice}</span>}
        oppIcon={<span className="text-sm font-bold">{oppChoice}</span>}
      />
      {(myDeclared || oppDeclared) && (
        <div className="flex flex-col gap-1 text-center text-[11px] text-arena-silver">
          {myDeclared && <p>あなたは「{myDeclared}」と宣言{iBluffed ? `し、実際は「${myChoice}」を選びました（ブラフ）` : "し、その通り選びました"}。</p>}
          {oppDeclared && <p>相手は「{oppDeclared}」と宣言{oppBluffed ? `し、実際は「${oppChoice}」を選びました（ブラフ）` : "し、その通り選びました"}。</p>}
        </div>
      )}
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] text-arena-silver/70">
          <Users className="h-3 w-3" />
          観衆を含めた内訳（A: {totalA} / B: {totalB}）
        </p>
        <div className="flex h-2 overflow-hidden rounded-full bg-arena-surface-2">
          <div className="h-full bg-arena-primary" style={{ width: `${(totalA / total) * 100}%` }} />
          <div className="h-full bg-arena-gold" style={{ width: `${(totalB / total) * 100}%` }} />
        </div>
      </div>
      <p className="text-center text-xs text-arena-silver">
        {minoritySide ? `少数派は「${minoritySide}」でした。` : "AとBが同数のため、少数派なしでした。"}
      </p>
    </div>
  );
}

function FinalPredictionReveal({ entry, myId, opponentId }: { entry: RoundEntry; myId: string; opponentId: string }) {
  const myMove = entry.actions[myId]?.actionData?.move as FinalPredictionMove | undefined;
  const oppMove = entry.actions[opponentId]?.actionData?.move as FinalPredictionMove | undefined;

  const moveIcon = (move?: FinalPredictionMove) => {
    if (move === "STRIKE") return <Zap className="h-5 w-5" />;
    if (move === "GUARD") return <Shield className="h-5 w-5" />;
    if (move === "READ") return <Eye className="h-5 w-5" />;
    return null;
  };

  const narrative =
    !myMove || !oppMove
      ? ""
      : myMove === oppMove
        ? "同じ手を選び、痛み分けでした。"
        : FINAL_PREDICTION_BEATS[myMove] === oppMove
          ? `${FINAL_PREDICTION_MOVE_LABELS[myMove].label}は${FINAL_PREDICTION_MOVE_LABELS[oppMove].label}に勝ちました。`
          : `${FINAL_PREDICTION_MOVE_LABELS[oppMove].label}に${FINAL_PREDICTION_MOVE_LABELS[myMove].label}が読まれました。`;

  return (
    <>
      <SideBySide
        myLabel={myMove ? FINAL_PREDICTION_MOVE_LABELS[myMove].label : ""}
        oppLabel={oppMove ? FINAL_PREDICTION_MOVE_LABELS[oppMove].label : ""}
        myIcon={moveIcon(myMove)}
        oppIcon={moveIcon(oppMove)}
      />
      <p className="text-center text-xs text-arena-silver">{narrative}</p>
    </>
  );
}
