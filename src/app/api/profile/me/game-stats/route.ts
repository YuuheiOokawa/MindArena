import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyGameStats } from "@/features/profiles/profile.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyGameStats(userId));
