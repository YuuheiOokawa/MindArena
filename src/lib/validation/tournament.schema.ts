import { z } from "zod";

export const joinTournamentSchema = z.object({
  leagueId: z.string().min(1),
});

export const submitActionSchema = z.object({
  round: z.number().int().positive(),
  actionType: z.string().min(1),
  actionData: z.unknown(),
});
