import { z } from "zod";

export const INQUIRY_CATEGORIES = [
  { value: "account", label: "アカウントについて" },
  { value: "tournament", label: "トーナメント・対戦について" },
  { value: "shop", label: "ショップ・賞金について" },
  { value: "bug", label: "不具合の報告" },
  { value: "other", label: "その他" },
] as const;

const CATEGORY_VALUES = INQUIRY_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const submitInquirySchema = z.object({
  category: z.enum(CATEGORY_VALUES, { message: "お問い合わせ種別を選択してください。" }),
  email: z.string().email("メールアドレスの形式が正しくありません。"),
  message: z
    .string()
    .min(10, "お問い合わせ内容は10文字以上で入力してください。")
    .max(2000, "お問い合わせ内容は2000文字以内で入力してください。"),
});

export type SubmitInquiryInput = z.infer<typeof submitInquirySchema>;
