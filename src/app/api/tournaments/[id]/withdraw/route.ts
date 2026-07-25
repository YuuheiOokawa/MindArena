import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { withdrawFromTournament } from "@/features/tournaments/withdraw.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const tournamentId = segmentAfter(request, "tournaments");
  return withdrawFromTournament(userId, tournamentId);
});
