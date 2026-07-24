import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { segmentAfter } from "@/lib/http/route-params";
import { getLeagueDetail } from "@/features/leagues/league.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";

export const GET = withAuthedRouteHandler(async ({ userId }, request) => {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  const leagueId = segmentAfter(request, "leagues");
  return getLeagueDetail(leagueId, profile.totalPoints);
});
