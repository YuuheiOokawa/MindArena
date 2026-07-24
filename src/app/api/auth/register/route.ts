import { withRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { registerSchema } from "@/lib/validation/auth.schema";
import { registerUser } from "@/features/auth/register.service";

export const POST = withRouteHandler(async (request) => {
  const input = await parseJsonBody(request, registerSchema);
  return registerUser(input);
});
