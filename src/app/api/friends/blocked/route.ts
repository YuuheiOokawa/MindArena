import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { blockUserSchema } from "@/lib/validation/friend.schema";
import { blockUser, listBlockedUsers } from "@/features/friends/block.service";

export const GET = withAuthedRouteHandler(({ userId }) => listBlockedUsers(userId));

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, blockUserSchema);
  return blockUser(userId, input.profileId, input.reason);
});
