import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getDailyBonusStatus } from "@/features/daily-bonus/daily-bonus.service";

export const GET = withAuthedRouteHandler(({ userId }) => getDailyBonusStatus(userId));
