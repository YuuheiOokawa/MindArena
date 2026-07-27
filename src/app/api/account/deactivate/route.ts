import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { deactivateAccountSchema } from "@/lib/validation/profile.schema";
import { deactivateAccount } from "@/features/auth/deactivate-account.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, deactivateAccountSchema);
  await deactivateAccount(userId, input.password);
  return { deactivated: true };
});
