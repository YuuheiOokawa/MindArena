import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getDailyMissionsStatus } from "@/features/daily-missions/daily-missions.service";

export const GET = withAuthedRouteHandler(({ userId }) => getDailyMissionsStatus(userId));
