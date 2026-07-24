import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { segmentAfter } from "@/lib/http/route-params";
import { submitActionSchema } from "@/lib/validation/tournament.schema";
import { submitPlayerAction } from "@/features/games/core/session-service";
import { getMyParticipantIdForMatch } from "@/features/tournaments/participant-lookup";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const matchId = segmentAfter(request, "matches");
  const participantId = await getMyParticipantIdForMatch(userId, matchId);
  const action = await parseJsonBody(request, submitActionSchema);
  return submitPlayerAction(matchId, participantId, action);
});
