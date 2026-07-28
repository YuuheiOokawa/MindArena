import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyAchievementCatalog } from "@/features/profiles/profile.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyAchievementCatalog(userId));
