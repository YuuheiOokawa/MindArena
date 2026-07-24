import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { acceptFriendRequest } from "@/features/friends/friend-request.service";

export const POST = withAuthedRouteHandler(({ userId }, request) => {
  const friendshipId = segmentAfter(request, "requests");
  return acceptFriendRequest(userId, friendshipId);
});
