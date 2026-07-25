import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { acceptTournamentInvite } from "@/features/tournaments/invite.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const inviteId = segmentAfter(request, "invites");
  return acceptTournamentInvite(userId, inviteId);
});
