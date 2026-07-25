import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { sendChallengeSchema } from "@/lib/validation/friend.schema";
import { listIncomingChallenges, listOutgoingChallenges, sendChallenge } from "@/features/friends/challenge.service";

export const GET = withAuthedRouteHandler(async ({ userId }) => {
  const [incoming, outgoing] = await Promise.all([listIncomingChallenges(userId), listOutgoingChallenges(userId)]);
  return { incoming, outgoing };
});

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, sendChallengeSchema);
  return sendChallenge(userId, input.opponentProfileId);
});
