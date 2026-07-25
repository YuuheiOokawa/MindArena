import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { AppError } from "@/lib/errors/app-error";
import { listInvitableFriendsForLeague } from "@/features/tournaments/invite.service";

export const GET = withAuthedRouteHandler(({ userId }, request) => {
  const leagueId = new URL(request.url).searchParams.get("leagueId");
  if (!leagueId) throw new AppError("VALIDATION_ERROR", "leagueIdが必要です。");
  return listInvitableFriendsForLeague(userId, leagueId);
});
