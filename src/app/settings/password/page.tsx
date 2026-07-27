"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/profile.schema";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    try {
      await apiClient.post("/api/account/change-password", values);
      setDone(true);
    } catch (e) {
      setServerError(e instanceof ApiClientError ? e.message : "パスワードの変更に失敗しました。");
    }
  }

  if (done) {
    return (
      <AppScreen header={<FocusHeader title="パスワード変更" backHref="/settings" />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-arena-white">パスワードを変更しました</p>
          <Button variant="secondary" onClick={() => router.push("/settings")} className="mt-2">
            設定画面に戻る
          </Button>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen header={<FocusHeader title="パスワード変更" backHref="/settings" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">現在のパスワード</span>
            <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
            {errors.currentPassword && <span className="text-xs text-arena-danger">{errors.currentPassword.message}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">新しいパスワード</span>
            <Input type="password" autoComplete="new-password" {...register("newPassword")} />
            {errors.newPassword && <span className="text-xs text-arena-danger">{errors.newPassword.message}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">新しいパスワード（確認）</span>
            <Input type="password" autoComplete="new-password" {...register("confirmNewPassword")} />
            {errors.confirmNewPassword && <span className="text-xs text-arena-danger">{errors.confirmNewPassword.message}</span>}
          </label>

          {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "変更中…" : "パスワードを変更する"}
          </Button>
        </form>
      </div>
    </AppScreen>
  );
}
