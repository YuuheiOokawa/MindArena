import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getShopCatalog } from "@/features/shop/shop.service";

export const GET = withAuthedRouteHandler(({ userId }) => getShopCatalog(userId));
