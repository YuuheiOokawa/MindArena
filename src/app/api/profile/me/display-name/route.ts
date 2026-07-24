import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { updateDisplayNameSchema } from "@/lib/validation/profile.schema";
import { updateMyDisplayName } from "@/features/profiles/update-profile.service";

export const PATCH = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, updateDisplayNameSchema);
  return updateMyDisplayName(userId, input);
});
