"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateDisplayNameSchema, type UpdateDisplayNameInput } from "@/lib/validation/profile.schema";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateDisplayNameInput>({ resolver: zodResolver(updateDisplayNameSchema) });

  async function onSubmit(values: UpdateDisplayNameInput) {
    setServerError(null);
    try {
      await apiClient.patch("/api/profile/me/display-name", values);
      router.replace("/home");
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "更新に失敗しました。");
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <h1 className="text-xl font-bold text-arena-white">プロフィール設定</h1>
      <p className="mt-1 text-sm text-arena-silver">アリーナで表示される名前を決めましょう。</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-arena-silver">表示名</span>
          <Input autoComplete="nickname" {...register("displayName")} />
          {errors.displayName && <span className="text-xs text-arena-danger">{errors.displayName.message}</span>}
        </label>

        {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "保存中…" : "はじめる"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.replace("/home")}>
          スキップ
        </Button>
      </form>
    </div>
  );
}
