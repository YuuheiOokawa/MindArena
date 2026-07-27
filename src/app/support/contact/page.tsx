"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitInquirySchema, INQUIRY_CATEGORIES, type SubmitInquiryInput } from "@/lib/validation/inquiry.schema";
import { MailCheck } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmitInquiryInput>({ resolver: zodResolver(submitInquirySchema) });

  async function onSubmit(values: SubmitInquiryInput) {
    setServerError(null);
    try {
      await apiClient.post("/api/support/inquiries", values);
      setSent(true);
    } catch (e) {
      setServerError(e instanceof ApiClientError ? e.message : "送信に失敗しました。時間をおいて再度お試しください。");
    }
  }

  if (sent) {
    return (
      <AppScreen header={<FocusHeader title="お問い合わせ" backHref="/settings" />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <MailCheck className="h-10 w-10 text-arena-success" />
          <p className="text-lg font-semibold text-arena-white">お問い合わせを受け付けました</p>
          <p className="text-sm text-arena-silver">内容を確認の上、ご登録いただいたメールアドレス宛にご連絡する場合があります。</p>
          <Link href="/settings" className="mt-4 text-sm font-semibold text-arena-primary-soft">
            設定画面に戻る
          </Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen header={<FocusHeader title="お問い合わせ" backHref="/settings" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <p className="text-xs text-arena-silver">
          ご不明点やご要望、不具合の報告などはこちらからお送りください。内容によってはご返信までお時間をいただく場合があります。
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">お問い合わせ種別</span>
            <select
              className="h-11 rounded-xl border border-arena-border bg-arena-surface-2 px-3 text-sm text-arena-white focus:border-arena-primary focus:outline-none"
              defaultValue=""
              {...register("category")}
            >
              <option value="" disabled>
                選択してください
              </option>
              {INQUIRY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && <span className="text-xs text-arena-danger">{errors.category.message}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">返信用メールアドレス</span>
            <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <span className="text-xs text-arena-danger">{errors.email.message}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-arena-silver">お問い合わせ内容</span>
            <textarea
              rows={6}
              className="rounded-xl border border-arena-border bg-arena-surface-2 px-3 py-2.5 text-sm text-arena-white placeholder:text-arena-silver/40 focus:border-arena-primary focus:outline-none"
              placeholder="内容をできるだけ詳しくご記入ください。"
              {...register("message")}
            />
            {errors.message && <span className="text-xs text-arena-danger">{errors.message.message}</span>}
          </label>

          {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "送信中…" : "送信する"}
          </Button>
        </form>
      </div>
    </AppScreen>
  );
}
