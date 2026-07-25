import { z } from "zod";

export const updateSettingsSchema = z.object({
  soundEnabled: z.boolean().optional(),
  bgmEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  showBotTag: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const updateDisplayNameSchema = z.object({
  displayName: z.string().min(2, "2文字以上で入力してください。").max(20, "20文字以内で入力してください。"),
});

export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;

export const updateCosmeticsSchema = z.object({
  selectedFrameId: z.string().nullable().optional(),
  selectedTitleId: z.string().nullable().optional(),
  selectedAvatarIconId: z.string().nullable().optional(),
  // Base64 data URI of a client-resized square thumbnail — generous cap as a backstop against an
  // oversized payload bypassing the client-side resize, not a precise byte budget.
  customAvatarUrl: z
    .string()
    .max(400_000, "画像サイズが大きすぎます。")
    .nullable()
    .optional(),
});

export type UpdateCosmeticsInput = z.infer<typeof updateCosmeticsSchema>;
