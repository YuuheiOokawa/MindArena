import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { declineChallenge } from "@/features/friends/challenge.service";

/** Handles both declining an incoming challenge and cancelling one the caller sent. */
export const DELETE = withAuthedRouteHandler(async ({ userId }, request) => {
  const challengeId = segmentAfter(request, "challenges");
  await declineChallenge(userId, challengeId);
  return { removed: true };
});
