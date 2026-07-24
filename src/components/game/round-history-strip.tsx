import { cn } from "@/lib/utils/cn";

interface RoundRecordLike {
  round: number;
  outcome?: Record<string, number>;
}

/** Per-round WIN/LOSE/TIE pips, revealed only for rounds that have already resolved (source spec's "ラウンド進行" cue). */
export function RoundHistoryStrip({
  totalRounds,
  history,
  myId,
  opponentId,
}: {
  totalRounds: number;
  history: RoundRecordLike[];
  myId: string;
  opponentId: string;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
        const record = history.find((h) => h.round === round);
        const mine = record?.outcome?.[myId];
        const theirs = record?.outcome?.[opponentId];
        const resolved = mine !== undefined && theirs !== undefined;
        const result = !resolved ? null : mine > theirs ? "WIN" : mine < theirs ? "LOSE" : "DRAW";

        return (
          <div
            key={round}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5",
              result === "WIN" && "border-arena-success/40 bg-arena-success/10",
              result === "LOSE" && "border-arena-danger/40 bg-arena-danger/10",
              result === "DRAW" && "border-arena-border bg-arena-surface-2",
              !resolved && "border-dashed border-arena-border",
            )}
          >
            <span className="text-[10px] text-arena-silver/60">R{round}</span>
            <span
              className={cn(
                "text-[10px] font-bold",
                result === "WIN" && "text-arena-success",
                result === "LOSE" && "text-arena-danger",
                result === "DRAW" && "text-arena-silver",
                !resolved && "text-arena-silver/40",
              )}
            >
              {result ?? "–"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
