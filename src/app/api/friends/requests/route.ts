import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { sendFriendRequestSchema } from "@/lib/validation/friend.schema";
import { listIncomingFriendRequests, listOutgoingFriendRequests } from "@/features/friends/friend.service";
import { sendFriendRequest } from "@/features/friends/friend-request.service";

export const GET = withAuthedRouteHandler(async ({ userId }) => {
  const [incoming, outgoing] = await Promise.all([
    listIncomingFriendRequests(userId),
    listOutgoingFriendRequests(userId),
  ]);
  return { incoming, outgoing };
});

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, sendFriendRequestSchema);
  return sendFriendRequest(userId, input.username);
});
