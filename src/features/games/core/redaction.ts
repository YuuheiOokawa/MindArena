const PENDING_ACTION_BUCKET_KEYS = ["pendingActions", "pendingDeclarations", "pendingResponses"];

/**
 * Strips the opponent's action payload for whichever round/phase is still awaiting both sides,
 * replacing it with a "submitted" marker. Works across all 4 games without branching on
 * gameId because every game stores its in-flight actions under one of the same-shaped bucket
 * keys (source spec §19 — never reveal the opponent's pending choice).
 */
export function redactStateForParticipant<T extends Record<string, unknown>>(state: T, participantId: string): T {
  const clone = structuredClone(state) as Record<string, unknown>;

  for (const key of PENDING_ACTION_BUCKET_KEYS) {
    const bucket = clone[key];
    if (!bucket || typeof bucket !== "object") continue;

    // Once I've committed my own action in this bucket, there's nothing left to protect —
    // the opponent's matching entry (e.g. NUMBER BLUFF's declaration, revealed before the
    // RESPOND phase) becomes visible. Only redact while I still haven't acted.
    const iHaveSubmitted = Object.prototype.hasOwnProperty.call(bucket, participantId);
    if (iHaveSubmitted) continue;

    for (const [pid, action] of Object.entries(bucket as Record<string, Record<string, unknown>>)) {
      if (pid === participantId) continue;
      (bucket as Record<string, unknown>)[pid] = {
        participantId: action.participantId,
        round: action.round,
        actionType: action.actionType,
        submitted: true,
      };
    }
  }

  return clone as T;
}
