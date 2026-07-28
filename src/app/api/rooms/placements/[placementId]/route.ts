import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { removePlacement } from "@/features/rooms/placement.service";

export const DELETE = withAuthedRouteHandler(async ({ userId }, request) => {
  const placementId = segmentAfter(request, "placements");
  return removePlacement(userId, placementId);
});
