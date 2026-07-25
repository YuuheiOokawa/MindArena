import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { startTournamentNow } from "@/features/tournaments/invite.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const tournamentId = segmentAfter(request, "tournaments");
  await startTournamentNow(userId, tournamentId);
  return { started: true };
});
