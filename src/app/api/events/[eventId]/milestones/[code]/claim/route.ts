import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { claimEventMilestone } from "@/features/events/event.service";

export const POST = withAuthedRouteHandler(({ userId }, request) => {
  const eventId = segmentAfter(request, "events");
  const milestoneCode = segmentAfter(request, "milestones");
  return claimEventMilestone(userId, eventId, milestoneCode);
});
