import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { listMyFriends } from "@/features/friends/friend.service";

export const GET = withAuthedRouteHandler(({ userId }) => listMyFriends(userId));
