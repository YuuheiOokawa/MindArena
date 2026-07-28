import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { saveRoomLayoutSchema } from "@/lib/validation/room.schema";
import { getRoomPlacements, saveRoomLayout } from "@/features/rooms/placement.service";

export const GET = withAuthedRouteHandler(({ userId }) => getRoomPlacements(userId));

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, saveRoomLayoutSchema);
  return saveRoomLayout(userId, input.placements);
});
