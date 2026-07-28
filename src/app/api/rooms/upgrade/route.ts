import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { upgradeRoom } from "@/features/rooms/room.service";

export const POST = withAuthedRouteHandler(({ userId }) => upgradeRoom(userId));
