import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyWinRateTrend } from "@/features/profiles/match-history.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyWinRateTrend(userId));
