import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { updateSettingsSchema } from "@/lib/validation/profile.schema";
import { updateMySettings } from "@/features/profiles/update-profile.service";

export const PATCH = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, updateSettingsSchema);
  return updateMySettings(userId, input);
});
