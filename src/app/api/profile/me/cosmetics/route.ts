import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { updateCosmeticsSchema } from "@/lib/validation/profile.schema";
import { updateMyCosmetics } from "@/features/profiles/update-profile.service";

export const PATCH = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, updateCosmeticsSchema);
  return updateMyCosmetics(userId, input);
});
