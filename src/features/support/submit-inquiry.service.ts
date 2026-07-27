import { inquiryRepository } from "@/infrastructure/repositories/inquiry.repository";
import type { SubmitInquiryInput } from "@/lib/validation/inquiry.schema";

/** No outbound email is configured for this project, so submissions are simply persisted for
 * manual review rather than emailed to a support inbox. `userId` is optional — the contact form
 * is reachable both logged in (Settings) and logged out (e.g. a locked-out user). */
export async function submitInquiry(userId: string | null, input: SubmitInquiryInput) {
  await inquiryRepository.create({
    userId,
    category: input.category,
    email: input.email,
    message: input.message,
  });
  return { submitted: true };
}
