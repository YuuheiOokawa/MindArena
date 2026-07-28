import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { getFurnitureCatalog } from "@/features/shop/furniture.service";

export const GET = withAuthedRouteHandler(({ userId }) => getFurnitureCatalog(userId));
