import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { purchaseShopItemSchema } from "@/lib/validation/shop.schema";
import { purchaseShopItem } from "@/features/shop/shop.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, purchaseShopItemSchema);
  return purchaseShopItem(userId, input.itemId);
});
