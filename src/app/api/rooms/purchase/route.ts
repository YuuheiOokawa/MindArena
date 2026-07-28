import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { purchaseRoom } from "@/features/rooms/room.service";

export const POST = withAuthedRouteHandler(({ userId }) => purchaseRoom(userId));
