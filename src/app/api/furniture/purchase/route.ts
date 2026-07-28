import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { purchaseFurnitureItemSchema } from "@/lib/validation/room.schema";
import { purchaseFurnitureItem } from "@/features/shop/furniture.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, purchaseFurnitureItemSchema);
  return purchaseFurnitureItem(userId, input.itemId);
});
