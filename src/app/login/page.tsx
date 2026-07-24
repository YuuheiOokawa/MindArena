"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      setServerError("ユーザー名/メールアドレスまたはパスワードが正しくありません。");
      return;
    }
    router.replace("/home");
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-arena-primary/40 bg-arena-primary/10">
          <Crown className="h-7 w-7 text-arena-primary-soft" />
        </div>
        <h1 className="text-xl font-bold tracking-wide text-arena-white">{APP_CONFIG.title}</h1>
        <p className="text-sm text-arena-silver">{APP_CONFIG.shortTagline}</p>
      </div>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-arena-silver">ユーザー名またはメールアドレス</span>
          <Input autoComplete="username" {...register("identifier")} />
          {errors.identifier && <span className="text-xs text-arena-danger">{errors.identifier.message}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-arena-silver">パスワード</span>
          <Input type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <span className="text-xs text-arena-danger">{errors.password.message}</span>}
        </label>

        {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

        <Link href="/forgot-password" className="self-end text-xs text-arena-silver hover:text-arena-primary-soft">
          パスワードをお忘れですか？
        </Link>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "ログイン中…" : "ログイン"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-arena-border bg-arena-surface-2/60 p-3 text-xs text-arena-silver">
        開発用デモアカウント: <span className="text-arena-gold">demo</span> / <span className="text-arena-gold">Demo1234!</span>
      </div>

      <p className="mt-6 text-center text-sm text-arena-silver">
        アカウントをお持ちでないですか？{" "}
        <Link href="/register" className="font-semibold text-arena-primary-soft">
          新規登録
        </Link>
      </p>
    </div>
  );
}
