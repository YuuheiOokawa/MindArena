import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { listIncomingTournamentInvites } from "@/features/tournaments/invite.service";

export const GET = withAuthedRouteHandler(({ userId }) => listIncomingTournamentInvites(userId));
