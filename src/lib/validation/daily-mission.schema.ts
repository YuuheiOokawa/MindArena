import { z } from "zod";

export const claimDailyMissionSchema = z.object({
  missionCode: z.string().min(1),
});

export type ClaimDailyMissionInput = z.infer<typeof claimDailyMissionSchema>;
