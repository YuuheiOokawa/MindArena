"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateDisplayNameSchema, type UpdateDisplayNameInput } from "@/lib/validation/profile.schema";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GameRulesCard } from "@/components/common/game-rules-card";
import { TUTORIAL_SECTIONS } from "@/config/tutorial";
import { GAME_CATALOG } from "@/config/games";

type Step = "profile" | "tutorial";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("profile");

  return step === "profile" ? (
    <ProfileStep onDone={() => setStep("tutorial")} />
  ) : (
    <TutorialStep />
  );
}

function ProfileStep({ onDone }: { onDone: () => void }) {
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
      onDone();
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : "更新に失敗しました。");
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-10 pt-16">
      <p className="text-xs font-semibold text-arena-primary-soft">STEP 1 / 2</p>
      <h1 className="mt-1 text-xl font-bold text-arena-white">プロフィール設定</h1>
      <p className="mt-1 text-sm text-arena-silver">アリーナで表示される名前を決めましょう。</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-arena-silver">表示名</span>
          <Input autoComplete="nickname" {...register("displayName")} />
          {errors.displayName && <span className="text-xs text-arena-danger">{errors.displayName.message}</span>}
        </label>

        {serverError && <p className="text-sm text-arena-danger">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "保存中…" : "次へ"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          スキップ
        </Button>
      </form>
    </div>
  );
}

function TutorialStep() {
  const router = useRouter();

  return (
    <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-12">
      <p className="text-xs font-semibold text-arena-primary-soft">STEP 2 / 2</p>
      <h1 className="mt-1 text-xl font-bold text-arena-white">遊び方を覚えよう</h1>

      <div className="mt-6 flex flex-col gap-5">
        {TUTORIAL_SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-1.5">
            <h2 className="text-sm font-bold text-arena-white">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-xs leading-relaxed text-arena-silver">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-arena-white">4つの心理戦ゲーム</h2>
          <div className="flex flex-col gap-2">
            {GAME_CATALOG.map((game) => (
              <GameRulesCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      </div>

      <p className="mt-5 text-[11px] text-arena-silver/60">この内容はプロフィール画面の「遊び方」からいつでも確認できます。</p>

      <Button className="mt-4" onClick={() => router.replace("/home")}>
        はじめる
      </Button>
    </div>
  );
}
