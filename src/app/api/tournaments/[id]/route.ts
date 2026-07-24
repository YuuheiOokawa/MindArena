import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getTournamentView } from "@/features/tournaments/tournament-view.service";

export const GET = withAuthedRouteHandler(async ({ userId }, request) => {
  const tournamentId = segmentAfter(request, "tournaments");
  return getTournamentView(userId, tournamentId);
});
