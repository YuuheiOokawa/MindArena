import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { joinTournamentSchema } from "@/lib/validation/tournament.schema";
import { joinTournament } from "@/features/tournaments/join.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const { leagueId } = await parseJsonBody(request, joinTournamentSchema);
  return joinTournament(userId, leagueId);
});
