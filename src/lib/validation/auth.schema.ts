import { z } from "zod";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const PASSWORD_HAS_LETTER = /[a-zA-Z]/;
const PASSWORD_HAS_NUMBER = /[0-9]/;

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "ユーザー名は3文字以上で入力してください。")
      .max(20, "ユーザー名は20文字以内で入力してください。")
      .regex(USERNAME_PATTERN, "ユーザー名は半角英数字とアンダースコアのみ使用できます。"),
    email: z.string().email("メールアドレスの形式が正しくありません。"),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください。")
      .max(72, "パスワードは72文字以内で入力してください。")
      .regex(PASSWORD_HAS_LETTER, "パスワードには英字を含めてください。")
      .regex(PASSWORD_HAS_NUMBER, "パスワードには数字を含めてください。"),
    confirmPassword: z.string(),
    agreedToTerms: z.literal(true, { message: "利用規約への同意が必要です。" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません。",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1, "ユーザー名またはメールアドレスを入力してください。"),
  password: z.string().min(1, "パスワードを入力してください。"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません。"),
});
