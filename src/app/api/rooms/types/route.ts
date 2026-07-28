import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getRoomTypeCatalog } from "@/features/rooms/room.service";

export const GET = withAuthedRouteHandler(({ userId }) => getRoomTypeCatalog(userId));
