import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getLeaderboard } from "@/features/leaderboard/leaderboard.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const scope = new URL(request.url).searchParams.get("scope") === "league" ? "league" : "global";
  return getLeaderboard(userId, scope);
});
