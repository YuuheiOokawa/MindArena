"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { usePreferences, type Preferences } from "@/components/providers/preferences-provider";

const TOGGLES: { key: keyof Preferences; label: string; description: string }[] = [
  { key: "soundEnabled", label: "効果音", description: "ボタン操作や結果表示の効果音" },
  { key: "bgmEnabled", label: "BGM", description: "対戦中の背景音楽" },
  { key: "vibrationEnabled", label: "振動", description: "選択確定時などの振動フィードバック" },
  { key: "reducedMotion", label: "演出軽減", description: "アニメーションを短縮・簡略化します" },
  { key: "showBotTag", label: "BOT表記", description: "対戦相手がBOTであることを表示します" },
];

export default function SettingsPage() {
  const preferences = usePreferences();
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function toggle(key: keyof Preferences) {
    setToggleError(null);
    try {
      await preferences.setPreference(key, !preferences[key]);
    } catch (e) {
      setToggleError(e instanceof ApiClientError ? e.message : "設定の保存に失敗しました。");
    }
  }

  return (
    <AppScreen header={<FocusHeader title="設定" backHref="/profile" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        {!preferences.loaded ? (
          <LoadingState />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {toggleError && <p className="text-xs text-arena-danger">{toggleError}</p>}
              {TOGGLES.map((item) => (
                <Card key={item.key}>
                  <CardContent className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-medium text-arena-white">{item.label}</p>
                      <p className="text-xs text-arena-silver">{item.description}</p>
                    </div>
                    <SwitchToggle checked={preferences[item.key]} onChange={() => toggle(item.key)} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="danger" className="mt-4" onClick={() => signOut({ callbackUrl: "/login" })}>
              ログアウト
            </Button>
          </>
        )}
      </div>
    </AppScreen>
  );
}

function SwitchToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-arena-gold" : "bg-arena-surface-2 border border-arena-border"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
