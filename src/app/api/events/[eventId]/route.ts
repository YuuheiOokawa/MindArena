import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getEventDetail } from "@/features/events/event.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const eventId = segmentAfter(request, "events");
  return getEventDetail(userId, eventId);
});
