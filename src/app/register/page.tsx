"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth.schema";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      await apiClient.post("/api/auth/register", values);
      const result = await signIn("credentials", {
        identifier: values.username,
        password: values.password,
        redirect: false,
      });
      if (result?.error) {
        setServerError("登録は完了しましたが、自動ログインに失敗しました。ログイン画面からお試しください。");
        return;
      }
      router.replace("/onboarding");
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "登録に失敗しました。時間をおいて再度お試しください。");
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-12">
      <h1 className="text-xl font-bold text-arena-white">{APP_CONFIG.title}に新規登録</h1>
      <p className="mt-1 text-sm text-arena-silver">心理戦の舞台へようこそ。</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="ユーザー名" error={errors.username?.message}>
          <Input autoComplete="username" placeholder="mind_player" {...register("username")} />
        </Field>
        <Field label="メールアドレス" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="パスワード" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="パスワード（確認）" error={errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
        </Field>

        <label className="mt-1 flex items-start gap-2 text-xs text-arena-silver">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-arena-gold" {...register("agreedToTerms")} />
          利用規約およびプライバシーポリシーに同意します。
        </label>
        {errors.agreedToTerms && <p className="-mt-2 text-xs text-arena-danger">{errors.agreedToTerms.message}</p>}

        {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "登録中…" : "登録する"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-arena-silver">
        すでにアカウントをお持ちですか？{" "}
        <Link href="/login" className="font-semibold text-arena-gold">
          ログイン
        </Link>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-arena-silver">{label}</span>
      {children}
      {error && <span className="text-xs text-arena-danger">{error}</span>}
    </label>
  );
}
