import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyAchievements } from "@/features/profiles/profile.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyAchievements(userId));
