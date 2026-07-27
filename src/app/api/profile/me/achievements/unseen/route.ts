import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { consumeUnseenAchievements } from "@/features/achievements/notify.service";

export const POST = withAuthedRouteHandler(({ userId }) => consumeUnseenAchievements(userId));
