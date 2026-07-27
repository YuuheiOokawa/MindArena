import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { claimDailyBonus } from "@/features/daily-bonus/daily-bonus.service";

export const POST = withAuthedRouteHandler(({ userId }) => claimDailyBonus(userId));
