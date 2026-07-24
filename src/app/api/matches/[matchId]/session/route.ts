import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getSessionStateForParticipant, startOrResumeSession } from "@/features/games/core/session-service";
import { getMyParticipantIdForMatch } from "@/features/tournaments/participant-lookup";

export const GET = withAuthedRouteHandler(async ({ userId }, request) => {
  const matchId = segmentAfter(request, "matches");
  const participantId = await getMyParticipantIdForMatch(userId, matchId);
  return getSessionStateForParticipant(matchId, participantId);
});

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const matchId = segmentAfter(request, "matches");
  const participantId = await getMyParticipantIdForMatch(userId, matchId);
  return startOrResumeSession(matchId, participantId);
});
