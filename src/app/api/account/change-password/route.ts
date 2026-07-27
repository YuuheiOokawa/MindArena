import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { changePasswordSchema } from "@/lib/validation/profile.schema";
import { changePassword } from "@/features/auth/change-password.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, changePasswordSchema);
  return changePassword(userId, input.currentPassword, input.newPassword);
});
