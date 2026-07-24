import { isDeclarationTrue, type NumberBluffDeclarationId } from "@/config/games/number-bluff";

export interface ResponseScore {
  responderPoints: number;
  declarerPoints: number;
}

/**
 * declarationTrue/believed payoff table:
 *  true  + believed    -> responder correctly trusted   (+1 / +1)
 *  true  + not believed -> responder wrongly doubted truth (-1 / 0)
 *  false + believed    -> responder fooled by the bluff  (-1 / +2)
 *  false + not believed -> responder caught the bluff    (+2 / -1)
 */
export function scoreResponse(declarationTrue: boolean, believed: boolean): ResponseScore {
  if (declarationTrue && believed) return { responderPoints: 1, declarerPoints: 1 };
  if (declarationTrue && !believed) return { responderPoints: -1, declarerPoints: 0 };
  if (!declarationTrue && believed) return { responderPoints: -1, declarerPoints: 2 };
  return { responderPoints: 2, declarerPoints: -1 };
}

export function computeRoundScores(params: {
  numberA: number;
  declarationIdA: NumberBluffDeclarationId;
  believeA_aboutB: boolean;
  numberB: number;
  declarationIdB: NumberBluffDeclarationId;
  believeB_aboutA: boolean;
}): { scoreA: number; scoreB: number } {
  const { numberA, declarationIdA, believeA_aboutB, numberB, declarationIdB, believeB_aboutA } = params;

  const declarationATrue = isDeclarationTrue(declarationIdA, numberA, numberB);
  const declarationBTrue = isDeclarationTrue(declarationIdB, numberB, numberA);

  // A responds to B's declaration; B responds to A's declaration.
  const aAsResponder = scoreResponse(declarationBTrue, believeA_aboutB);
  const bAsResponder = scoreResponse(declarationATrue, believeB_aboutA);

  return {
    scoreA: aAsResponder.responderPoints + bAsResponder.declarerPoints,
    scoreB: bAsResponder.responderPoints + aAsResponder.declarerPoints,
  };
}
