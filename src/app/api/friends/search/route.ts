import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { AppError } from "@/lib/errors/app-error";
import { searchPlayerByUsername } from "@/features/friends/friend.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const username = new URL(request.url).searchParams.get("username")?.trim();
  if (!username) throw new AppError("VALIDATION_ERROR", "ユーザー名を入力してください。");
  return searchPlayerByUsername(userId, username);
});
