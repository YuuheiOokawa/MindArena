import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { listLeaguesWithUnlockStatus } from "@/features/leagues/league.service";
import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";

export const GET = withAuthedRouteHandler(async ({ userId }) => {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return listLeaguesWithUnlockStatus(profile.totalPoints);
});
