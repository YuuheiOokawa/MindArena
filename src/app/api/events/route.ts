import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { listEvents } from "@/features/events/event.service";

export const GET = withAuthedRouteHandler(({ userId }) => listEvents(userId));
