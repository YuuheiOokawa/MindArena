import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { declineTournamentInvite } from "@/features/tournaments/invite.service";

export const DELETE = withAuthedRouteHandler(async ({ userId }, request) => {
  const inviteId = segmentAfter(request, "invites");
  await declineTournamentInvite(userId, inviteId);
  return { declined: true };
});
