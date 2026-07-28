import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { listOwnedFurniture } from "@/features/shop/furniture.service";

export const GET = withAuthedRouteHandler(({ userId }) => listOwnedFurniture(userId));
