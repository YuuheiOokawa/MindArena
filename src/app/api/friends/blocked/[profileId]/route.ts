import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { unblockUser } from "@/features/friends/block.service";

export const DELETE = withAuthedRouteHandler(async ({ userId }, request) => {
  const profileId = segmentAfter(request, "blocked");
  return unblockUser(userId, profileId);
});
