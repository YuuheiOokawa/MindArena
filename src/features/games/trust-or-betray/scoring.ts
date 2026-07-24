import type { TrustOrBetrayChoice } from "./types";

/**
 * Source spec §9 game 1 payoff table:
 *  TRUST/TRUST -> both even (+1/+1)
 *  TRUST/BETRAY -> betrayer wins (0/+2)
 *  BETRAY/TRUST -> betrayer wins (+2/0)
 *  BETRAY/BETRAY -> both penalized (-1/-1)
 */
export function scoreRound(
  choiceA: TrustOrBetrayChoice,
  choiceB: TrustOrBetrayChoice,
): { scoreA: number; scoreB: number } {
  if (choiceA === "TRUST" && choiceB === "TRUST") return { scoreA: 1, scoreB: 1 };
  if (choiceA === "TRUST" && choiceB === "BETRAY") return { scoreA: 0, scoreB: 2 };
  if (choiceA === "BETRAY" && choiceB === "TRUST") return { scoreA: 2, scoreB: 0 };
  return { scoreA: -1, scoreB: -1 };
}
