import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyPointHistory } from "@/features/profiles/profile.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return getMyPointHistory(userId, cursor);
});
