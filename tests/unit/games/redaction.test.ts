import { describe, expect, it } from "vitest";
import { redactStateForParticipant } from "@/features/games/core/redaction";

/**
 * Regression coverage for the "相手の数字も見えてしまう" bug: NUMBER BLUFF's pendingDeclarations
 * bucket must keep the opponent's real number hidden through the whole RESPOND phase — only the
 * public bluff claim (declarationId) may be exposed once I've also declared.
 */
describe("redactStateForParticipant", () => {
  it("hides the opponent's entire pendingDeclarations entry before I've submitted my own", () => {
    const state = {
      pendingDeclarations: {
        p2: { participantId: "p2", round: 1, actionType: "DECLARE", actionData: { number: 7, declarationId: "gte-5" } },
      },
    };

    const redacted = redactStateForParticipant(state, "p1");

    expect(redacted.pendingDeclarations.p2).toEqual({
      participantId: "p2",
      round: 1,
      actionType: "DECLARE",
      submitted: true,
    });
  });

  it("exposes only declarationId (not the real number) once I've also declared", () => {
    const state = {
      pendingDeclarations: {
        p1: { participantId: "p1", round: 1, actionType: "DECLARE", actionData: { number: 3, declarationId: "odd" } },
        p2: { participantId: "p2", round: 1, actionType: "DECLARE", actionData: { number: 7, declarationId: "gte-5" } },
      },
    };

    const redacted = redactStateForParticipant(state, "p1");

    // My own entry is untouched.
    expect(redacted.pendingDeclarations.p1.actionData).toEqual({ number: 3, declarationId: "odd" });
    // The opponent's number stays hidden; only the public bluff claim is visible.
    expect(redacted.pendingDeclarations.p2.actionData).toEqual({ declarationId: "gte-5" });
    expect((redacted.pendingDeclarations.p2.actionData as Record<string, unknown>).number).toBeUndefined();
  });

  it("leaves a bucket with no PUBLIC_ACTION_DATA_FIELDS entry fully visible once I've submitted (unchanged prior behavior)", () => {
    const state = {
      pendingActions: {
        p1: { participantId: "p1", round: 1, actionType: "CHOOSE", actionData: { choice: "TRUST" } },
        p2: { participantId: "p2", round: 1, actionType: "CHOOSE", actionData: { choice: "BETRAY" } },
      },
    };

    const redacted = redactStateForParticipant(state, "p1");

    expect(redacted.pendingActions.p2.actionData).toEqual({ choice: "BETRAY" });
  });

  it("never touches a bucket key outside the known pending-action bucket list (e.g. MINORITY CHOICE's live declarations)", () => {
    const state = {
      declarations: {
        p2: { participantId: "p2", round: 1, actionType: "DECLARE", actionData: { choice: "A" } },
      },
    };

    const redacted = redactStateForParticipant(state, "p1");

    expect(redacted.declarations.p2.actionData).toEqual({ choice: "A" });
  });
});
