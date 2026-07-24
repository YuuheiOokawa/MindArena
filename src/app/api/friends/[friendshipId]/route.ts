import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { removeFriendship } from "@/features/friends/friend-request.service";

/** Handles decline of an incoming request, cancel of an outgoing request, and unfriending an accepted pair. */
export const DELETE = withAuthedRouteHandler(async ({ userId }, request) => {
  const friendshipId = segmentAfter(request, "friends");
  await removeFriendship(userId, friendshipId);
  return { removed: true };
});
