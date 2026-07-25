"use client";

import { Bot, Crown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BracketParticipant {
  id: string;
  name: string;
  isBot: boolean;
}

export interface BracketMatch {
  id: string;
  matchNumber: number;
  status: string;
  player1: BracketParticipant | null;
  player2: BracketParticipant | null;
  winnerParticipantId: string | null;
  involvesMe: boolean;
}

export interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

const BOX_WIDTH = 100;
const BOX_HEIGHT = 60;
const UNIT_WIDTH = 116;
const CONNECTOR_HEIGHT = 28;
const ROW_HEIGHT = BOX_HEIGHT + CONNECTOR_HEIGHT;

// Counted backward from the final so labeling stays correct regardless of how many rounds a
// bracket has (a 2-player friend battle's only round IS the final, not "1回戦").
const LABELS_FROM_FINAL = ["決勝", "準決勝", "準々決勝", "2回戦", "1回戦"];

function roundLabel(round: number, totalRounds: number): string {
  return LABELS_FROM_FINAL[totalRounds - round] ?? `第${round}ラウンド`;
}

/**
 * A genuine connected tournament bracket: the champion sits at the top, each round's matches
 * fan out below it with SVG connector lines joining sibling pairs up into their shared next-round
 * slot. All rounds share one coordinate system (in units of the largest round's match count) so
 * a pair's connector always lands exactly on its parent slot's center, however many rounds there
 * are. Freshly-decided matches (freshMatchIds) glow; freshMatchIds also drives a one-shot
 * rise-in entrance for every box on first mount.
 */
export function BracketTree({
  rounds,
  totalRounds,
  freshMatchIds,
  playEntrance,
}: {
  rounds: BracketRound[];
  /** The tournament's true total round count (e.g. log2(maxPlayers)) — NOT rounds.length, which
   * only reflects how many rounds have been generated so far and grows as the bracket
   * progresses. Using rounds.length here would relabel rounds incorrectly and make every box
   * jump to a new row each time a new round unlocks. */
  totalRounds: number;
  freshMatchIds: Set<string>;
  playEntrance: boolean;
}) {
  if (rounds.length === 0) return null;

  const sorted = [...rounds].sort((a, b) => a.round - b.round);
  const baseMatchCount = sorted[0].matches.length;
  const canvasWidth = baseMatchCount * UNIT_WIDTH;
  const canvasHeight = totalRounds * ROW_HEIGHT - CONNECTOR_HEIGHT;

  function displayIndex(roundNumber: number) {
    return totalRounds - roundNumber; // 0 = final round (top)
  }

  function centerX(matchCount: number, index: number) {
    return (index + 0.5) * ((baseMatchCount / matchCount) * UNIT_WIDTH);
  }

  return (
    <div className="no-scrollbar overflow-x-auto rounded-2xl border border-arena-border bg-arena-surface-2/40 p-3">
      <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
        {sorted.map((roundData, roundIdx) => {
          const rowTop = displayIndex(roundData.round) * ROW_HEIGHT;
          const nextRound = sorted[roundIdx + 1];

          return (
            <div key={roundData.round}>
              {roundData.matches.map((match, i) => {
                const x = centerX(roundData.matches.length, i);
                const fresh = freshMatchIds.has(match.id);
                return (
                  <div
                    key={match.id}
                    className={cn(
                      "absolute flex flex-col justify-center gap-0.5 rounded-lg border bg-arena-surface px-1.5 py-1 text-[10px]",
                      match.involvesMe ? "border-arena-primary" : "border-arena-border",
                      fresh && "arena-glow-pulse",
                      playEntrance && "arena-rise-in",
                    )}
                    style={{
                      left: x - BOX_WIDTH / 2,
                      top: rowTop,
                      width: BOX_WIDTH,
                      height: BOX_HEIGHT,
                      ...(playEntrance ? ({ "--arena-rise-delay": `${Math.min(i, 10) * 0.03}s` } as React.CSSProperties) : {}),
                    }}
                  >
                    <MiniParticipantRow participant={match.player1} winnerId={match.winnerParticipantId} resolved={match.status === "COMPLETED"} />
                    <div className="h-px bg-arena-border" />
                    <MiniParticipantRow participant={match.player2} winnerId={match.winnerParticipantId} resolved={match.status === "COMPLETED"} />
                  </div>
                );
              })}

              {nextRound && (
                <svg
                  className="absolute"
                  style={{ left: 0, top: rowTop - CONNECTOR_HEIGHT, width: canvasWidth, height: CONNECTOR_HEIGHT }}
                  viewBox={`0 0 ${canvasWidth} ${CONNECTOR_HEIGHT}`}
                >
                  {Array.from({ length: roundData.matches.length / 2 }, (_, k) => {
                    const xLow = centerX(roundData.matches.length, 2 * k);
                    const xHigh = centerX(roundData.matches.length, 2 * k + 1);
                    const xMid = centerX(nextRound.matches.length, k);
                    const mid = CONNECTOR_HEIGHT / 2;
                    const childMatch = roundData.matches[2 * k];
                    const siblingMatch = roundData.matches[2 * k + 1];
                    const flowing = freshMatchIds.has(childMatch.id) || (siblingMatch && freshMatchIds.has(siblingMatch.id));
                    return (
                      <g key={k} className={cn("stroke-arena-border", flowing && "stroke-arena-primary")} strokeWidth={1.5} fill="none">
                        <path d={`M ${xLow} ${CONNECTOR_HEIGHT} L ${xLow} ${mid} L ${xHigh} ${mid} L ${xHigh} ${CONNECTOR_HEIGHT}`} />
                        <path d={`M ${xMid} ${mid} L ${xMid} 0`} />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniParticipantRow({
  participant,
  winnerId,
  resolved,
}: {
  participant: BracketParticipant | null;
  winnerId: string | null;
  resolved: boolean;
}) {
  if (!participant) {
    return <p className="truncate text-arena-silver/40">未対戦</p>;
  }
  const isWinner = winnerId === participant.id;
  return (
    <div className="flex items-center gap-0.5">
      {participant.isBot && <Bot className="h-2.5 w-2.5 shrink-0 text-arena-silver/60" />}
      <span className={cn("truncate", isWinner ? "font-semibold text-arena-white" : "text-arena-silver")}>{participant.name}</span>
      {resolved && isWinner && <Crown className="h-2.5 w-2.5 shrink-0 text-arena-gold" />}
    </div>
  );
}

export { roundLabel };
