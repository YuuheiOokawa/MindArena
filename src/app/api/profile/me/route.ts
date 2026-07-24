import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getMyProfile } from "@/features/profiles/profile.service";

export const GET = withAuthedRouteHandler(({ userId }) => getMyProfile(userId));
