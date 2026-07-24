import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { resolveResumeState } from "@/features/tournaments/resume";

export const GET = withAuthedRouteHandler(({ userId }) => resolveResumeState(userId));
