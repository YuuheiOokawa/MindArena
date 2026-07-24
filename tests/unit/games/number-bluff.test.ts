import { describe, expect, it } from "vitest";
import { computeRoundScores, scoreResponse } from "@/features/games/number-bluff/scoring";

describe("number-bluff scoreResponse", () => {
  it("rewards correctly believing a true declaration", () => {
    expect(scoreResponse(true, true)).toEqual({ responderPoints: 1, declarerPoints: 1 });
  });

  it("penalizes wrongly doubting the truth", () => {
    expect(scoreResponse(true, false)).toEqual({ responderPoints: -1, declarerPoints: 0 });
  });

  it("rewards a successful bluff for the declarer, punishes the fooled responder", () => {
    expect(scoreResponse(false, true)).toEqual({ responderPoints: -1, declarerPoints: 2 });
  });

  it("rewards catching a bluff", () => {
    expect(scoreResponse(false, false)).toEqual({ responderPoints: 2, declarerPoints: -1 });
  });
});

describe("number-bluff computeRoundScores", () => {
  it("gives the honest, believed declarer and the correct responder positive combined scores", () => {
    // A declares truthfully (number 7, "gte-5" -> true) and B believes it.
    // B declares a lie (number 2, "gte-5" -> false) and A doubts it (catches the bluff).
    const { scoreA, scoreB } = computeRoundScores({
      numberA: 7,
      declarationIdA: "gte-5",
      believeA_aboutB: false,
      numberB: 2,
      declarationIdB: "gte-5",
      believeB_aboutA: true,
    });

    // A: responder catching B's bluff (+2) + declarer of a believed truth (+1) = 3
    expect(scoreA).toBe(3);
    // B: responder fooled by... wait B believed A's truthful declaration -> +1 as responder,
    // and B is declarer of a caught bluff -> -1. Net 0.
    expect(scoreB).toBe(0);
  });
});
