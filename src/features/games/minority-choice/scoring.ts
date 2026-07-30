import {
  MINORITY_CHOICE_CROWD_LEAN_MAX,
  MINORITY_CHOICE_CROWD_LEAN_MIN,
  MINORITY_CHOICE_CROWD_REVEALED,
  MINORITY_CHOICE_CROWD_SIZE,
} from "@/config/games/minority-choice";
import {
  createSeededRandom,
  hashStringToSeed,
} from "@/lib/utils/seeded-random";
import { isE2eTestMode } from "@/lib/e2e-test-mode";
import type { CrowdPreview, CrowdResult, MinorityChoiceOption } from "./types";

/** Deterministic per (session, round) so the same round always produces the same crowd split. */
export function simulateCrowd(sessionId: string, round: number): CrowdResult {
  // E2E test mode (see lib/e2e-test-mode.ts): fix the crowd fully toward "A" so the Playwright
  // happy-path spec — which always plays the bot to "A" and the human to "B" — reaches a
  // deterministic minority result instead of depending on genuine crowd randomness.
  if (isE2eTestMode()) {
    return { aCount: MINORITY_CHOICE_CROWD_SIZE, bCount: 0 };
  }

  const random = createSeededRandom(hashStringToSeed(`${sessionId}:${round}`));
  const lean =
    MINORITY_CHOICE_CROWD_LEAN_MIN +
    random() *
      (MINORITY_CHOICE_CROWD_LEAN_MAX - MINORITY_CHOICE_CROWD_LEAN_MIN);
  const aCount = Math.round(MINORITY_CHOICE_CROWD_SIZE * lean);
  return { aCount, bCount: MINORITY_CHOICE_CROWD_SIZE - aCount };
}

/**
 * The pre-round 事前公開票: a deterministic, proportionally-representative sample of
 * MINORITY_CHOICE_CROWD_REVEALED votes out of the full crowd, shown to BOTH players before they
 * act. Clamped so the implied hidden remainder is always consistent with the true totals (the
 * hidden A votes must fit inside the hidden pool) — the preview never lies, it's just incomplete.
 */
export function crowdPreview(crowd: CrowdResult): CrowdPreview {
  const hiddenCount =
    MINORITY_CHOICE_CROWD_SIZE - MINORITY_CHOICE_CROWD_REVEALED;
  const proportional = Math.round(
    (crowd.aCount * MINORITY_CHOICE_CROWD_REVEALED) /
      MINORITY_CHOICE_CROWD_SIZE,
  );
  const revealedA = Math.min(
    Math.max(proportional, crowd.aCount - hiddenCount, 0),
    MINORITY_CHOICE_CROWD_REVEALED,
    crowd.aCount,
  );
  return {
    revealedA,
    revealedB: MINORITY_CHOICE_CROWD_REVEALED - revealedA,
    hiddenCount,
  };
}

export function computeMinorityScore(
  choiceA: MinorityChoiceOption,
  choiceB: MinorityChoiceOption,
  crowd: CrowdResult,
): {
  scoreA: number;
  scoreB: number;
  minoritySide: MinorityChoiceOption | null;
} {
  const totalA =
    crowd.aCount + (choiceA === "A" ? 1 : 0) + (choiceB === "A" ? 1 : 0);
  const totalB =
    crowd.bCount + (choiceA === "B" ? 1 : 0) + (choiceB === "B" ? 1 : 0);

  const minoritySide: MinorityChoiceOption | null =
    totalA === totalB ? null : totalA < totalB ? "A" : "B";

  return {
    scoreA: choiceA === minoritySide ? 1 : 0,
    scoreB: choiceB === minoritySide ? 1 : 0,
    minoritySide,
  };
}
