import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください。"),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const sendChallengeSchema = z.object({
  opponentProfileId: z.string().min(1),
});

export type SendChallengeInput = z.infer<typeof sendChallengeSchema>;

export const blockUserSchema = z.object({
  profileId: z.string().min(1),
  reason: z.string().max(500, "理由は500文字以内で入力してください。").optional(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
