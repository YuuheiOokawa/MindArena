import { withAuthedRouteHandler } from "@/lib/http/with-route-handler";
import { parseJsonBody } from "@/lib/http/parse-body";
import { claimDailyMissionSchema } from "@/lib/validation/daily-mission.schema";
import { claimDailyMission } from "@/features/daily-missions/daily-missions.service";

export const POST = withAuthedRouteHandler(async ({ userId }, request) => {
  const input = await parseJsonBody(request, claimDailyMissionSchema);
  return claimDailyMission(userId, input.missionCode);
});
