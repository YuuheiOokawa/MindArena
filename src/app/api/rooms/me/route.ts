import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyRoom } from "@/features/rooms/room.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyRoom(userId));
