import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { acceptChallenge } from "@/features/friends/challenge.service";

export const POST = withAuthedRouteHandler(({ userId }, request) => {
  const challengeId = segmentAfter(request, "challenges");
  return acceptChallenge(userId, challengeId);
});
