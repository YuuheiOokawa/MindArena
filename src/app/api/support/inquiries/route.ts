import { withRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { submitInquirySchema } from "@/lib/validation/inquiry.schema";
import { submitInquiry } from "@/features/support/submit-inquiry.service";
import { auth } from "@/infrastructure/auth/auth";

export const POST = withRouteHandler(async (request) => {
  const input = await parseJsonBody(request, submitInquirySchema);
  const session = await auth();
  return submitInquiry(session?.user?.id ?? null, input);
});
