import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyMatchHistory } from "@/features/profiles/match-history.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return getMyMatchHistory(userId, cursor);
});
