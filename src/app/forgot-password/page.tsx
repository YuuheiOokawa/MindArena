"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validation/auth.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit() {
    // NOTE: dev-stage stub — actual email delivery is a documented future addition
    // (docs/01_REQUIREMENTS.md). The form still validates and gives real confirmation UX.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-arena-white">メールを確認してください</p>
        <p className="text-sm text-arena-silver">パスワード再設定の案内をお送りしました（開発環境では実際には送信されません）。</p>
        <Link href="/login" className="mt-4 text-sm font-semibold text-arena-primary-soft">
          ログイン画面に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <h1 className="text-xl font-bold text-arena-white">パスワードをお忘れですか？</h1>
      <p className="mt-1 text-sm text-arena-silver">登録済みのメールアドレスを入力してください。</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-arena-silver">メールアドレス</span>
          <Input type="email" autoComplete="email" {...register("email")} />
          {errors.email && <span className="text-xs text-arena-danger">{errors.email.message}</span>}
        </label>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "送信中…" : "再設定メールを送信"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 text-center text-sm text-arena-silver hover:text-arena-primary-soft">
        ログイン画面に戻る
      </Link>
    </div>
  );
}
