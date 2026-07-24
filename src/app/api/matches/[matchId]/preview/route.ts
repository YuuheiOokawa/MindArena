import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getMatchPreview } from "@/features/tournaments/match-preview.service";

export const GET = withAuthedRouteHandler(async ({ userId }, request) => {
  const matchId = segmentAfter(request, "matches");
  return getMatchPreview(userId, matchId);
});
