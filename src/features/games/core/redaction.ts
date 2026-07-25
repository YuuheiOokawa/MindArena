const PENDING_ACTION_BUCKET_KEYS = ["pendingActions", "pendingDeclarations", "pendingResponses"];

/**
 * actionData fields that stay visible in an opponent's bucket entry even after I've committed my
 * own action there. Everything else in actionData is stripped until the round resolves and the
 * entry moves into `history`. Only NUMBER BLUFF's pendingDeclarations bucket needs this: the
 * declarationId is the public bluff claim the RESPOND phase is about, but the real number must
 * stay secret — otherwise "believe/doubt" is just reading the ground truth off the state.
 */
const PUBLIC_ACTION_DATA_FIELDS: Record<string, string[]> = {
  pendingDeclarations: ["declarationId"],
};

/**
 * Strips the opponent's action payload for whichever round/phase is still awaiting both sides,
 * replacing it with a "submitted" marker (or, for buckets with public fields, a partial payload
 * exposing only those fields). Works across all 4 games without branching on gameId because
 * every game stores its in-flight actions under one of the same-shaped bucket keys (source spec
 * §19 — never reveal the opponent's pending choice beyond what that bucket declares public).
 */
export function redactStateForParticipant<T extends Record<string, unknown>>(state: T, participantId: string): T {
  const clone = structuredClone(state) as Record<string, unknown>;

  for (const key of PENDING_ACTION_BUCKET_KEYS) {
    const bucket = clone[key];
    if (!bucket || typeof bucket !== "object") continue;

    const iHaveSubmitted = Object.prototype.hasOwnProperty.call(bucket, participantId);
    const publicFields = PUBLIC_ACTION_DATA_FIELDS[key];

    for (const [pid, action] of Object.entries(bucket as Record<string, Record<string, unknown>>)) {
      if (pid === participantId) continue;

      if (!iHaveSubmitted) {
        // I haven't committed my own action in this bucket yet — hide the opponent's entirely
        // so I can't tailor mine to it.
        (bucket as Record<string, unknown>)[pid] = {
          participantId: action.participantId,
          round: action.round,
          actionType: action.actionType,
          submitted: true,
        };
        continue;
      }

      if (!publicFields) continue; // No field-level restriction for this bucket — fully visible once I've also submitted.

      const actionData = action.actionData as Record<string, unknown> | undefined;
      (bucket as Record<string, unknown>)[pid] = {
        ...action,
        actionData: actionData
          ? Object.fromEntries(publicFields.filter((field) => field in actionData).map((field) => [field, actionData[field]]))
          : actionData,
      };
    }
  }

  return clone as T;
}
