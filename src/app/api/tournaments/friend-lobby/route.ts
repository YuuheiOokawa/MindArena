import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { createFriendTournamentSchema } from "@/lib/validation/tournament.schema";
import { createFriendTournament } from "@/features/tournaments/join.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const { leagueId, inviteeProfileIds } = await parseJsonBody(request, createFriendTournamentSchema);
  return createFriendTournament(userId, leagueId, inviteeProfileIds);
});
