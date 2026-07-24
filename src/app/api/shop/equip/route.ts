import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { equipShopCosmeticSchema } from "@/lib/validation/shop.schema";
import { equipShopCosmetic } from "@/features/shop/shop.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, equipShopCosmeticSchema);
  return equipShopCosmetic(userId, input.category, input.itemId);
});
