import type { PlayerAction } from "@/domain/interfaces/psychological-game";

/**
 * Fixed, predictable BOT moves used only when isE2eTestMode() is true (see lib/e2e-test-mode.ts).
 * The Playwright happy-path spec always submits the documented counter-move for each game so a
 * full 32-player run can reach the championship deterministically without depending on genuine
 * bot/crowd randomness. Never consulted in production.
 */
export function getE2eTestBotAction(
  gameId: string,
  participantId: string,
  round: number,
  phase?: string,
): PlayerAction {
  const base = { participantId, round, submittedAt: Date.now() };

  switch (gameId) {
    case "trust-or-betray":
      return { ...base, actionType: "CHOOSE", actionData: { choice: "TRUST" } };
    case "final-prediction":
      return { ...base, actionType: "CHOOSE", actionData: { move: "GUARD" } };
    case "minority-choice":
      return phase === "CHOOSE"
        ? { ...base, actionType: "CHOOSE", actionData: { choice: "A" } }
        : { ...base, actionType: "DECLARE", actionData: { choice: "A" } };
    case "number-bluff":
      return phase === "RESPOND"
        ? { ...base, actionType: "RESPOND", actionData: { believe: true } }
        : { ...base, actionType: "DECLARE", actionData: { number: 9, declarationId: "gte-5" } };
    default:
      throw new Error(`No E2E test-mode bot action defined for game ${gameId}`);
  }
}

/** The human move that deterministically beats getE2eTestBotAction's fixed move for each game. */
export const E2E_WINNING_HUMAN_ACTION: Record<string, { actionType: string; actionData: unknown } | ((phase: string) => { actionType: string; actionData: unknown })> = {
  "trust-or-betray": { actionType: "CHOOSE", actionData: { choice: "BETRAY" } },
  "final-prediction": { actionType: "CHOOSE", actionData: { move: "READ" } },
  "minority-choice": (phase: string) =>
    phase === "CHOOSE" ? { actionType: "CHOOSE", actionData: { choice: "B" } } : { actionType: "DECLARE", actionData: { choice: "B" } },
  "number-bluff": (phase: string) =>
    phase === "RESPOND"
      ? { actionType: "RESPOND", actionData: { believe: true } }
      : { actionType: "DECLARE", actionData: { number: 1, declarationId: "gte-5" } },
};
