import {
  MINORITY_CHOICE_CROWD_LEAN_MAX,
  MINORITY_CHOICE_CROWD_LEAN_MIN,
  MINORITY_CHOICE_CROWD_SIZE,
} from "@/config/games/minority-choice";
import { createSeededRandom, hashStringToSeed } from "@/lib/utils/seeded-random";
import { isE2eTestMode } from "@/lib/e2e-test-mode";
import type { CrowdResult, MinorityChoiceOption } from "./types";

/** Deterministic per (session, round) so the same round always produces the same crowd split. */
export function simulateCrowd(sessionId: string, round: number): CrowdResult {
  // E2E test mode (see lib/e2e-test-mode.ts): fix the crowd fully toward "A" so the Playwright
  // happy-path spec — which always plays the bot to "A" and the human to "B" — reaches a
  // deterministic minority result instead of depending on genuine crowd randomness.
  if (isE2eTestMode()) {
    return { aCount: MINORITY_CHOICE_CROWD_SIZE, bCount: 0 };
  }

  const random = createSeededRandom(hashStringToSeed(`${sessionId}:${round}`));
  const lean = MINORITY_CHOICE_CROWD_LEAN_MIN + random() * (MINORITY_CHOICE_CROWD_LEAN_MAX - MINORITY_CHOICE_CROWD_LEAN_MIN);
  const aCount = Math.round(MINORITY_CHOICE_CROWD_SIZE * lean);
  return { aCount, bCount: MINORITY_CHOICE_CROWD_SIZE - aCount };
}

export function computeMinorityScore(
  choiceA: MinorityChoiceOption,
  choiceB: MinorityChoiceOption,
  crowd: CrowdResult,
): { scoreA: number; scoreB: number; minoritySide: MinorityChoiceOption | null } {
  const totalA = crowd.aCount + (choiceA === "A" ? 1 : 0) + (choiceB === "A" ? 1 : 0);
  const totalB = crowd.bCount + (choiceA === "B" ? 1 : 0) + (choiceB === "B" ? 1 : 0);

  const minoritySide: MinorityChoiceOption | null = totalA === totalB ? null : totalA < totalB ? "A" : "B";

  return {
    scoreA: choiceA === minoritySide ? 1 : 0,
    scoreB: choiceB === minoritySide ? 1 : 0,
    minoritySide,
  };
}
