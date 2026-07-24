import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getMatchResultForParticipant } from "@/features/games/core/session-service";
import { getMyParticipantIdForMatch } from "@/features/tournaments/participant-lookup";

export const GET = withAuthedRouteHandler(async ({ userId }, request) => {
  const matchId = segmentAfter(request, "matches");
  const participantId = await getMyParticipantIdForMatch(userId, matchId);
  return getMatchResultForParticipant(matchId, participantId);
});
