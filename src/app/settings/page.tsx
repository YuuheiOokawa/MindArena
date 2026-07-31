"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/common/loading-state";
import { usePreferences, type Preferences } from "@/components/providers/preferences-provider";
import { ChevronRight, KeyRound, Mail, ShieldAlert, ShieldOff } from "lucide-react";

const TOGGLES: { key: keyof Preferences; label: string; description: string }[] = [
  { key: "soundEnabled", label: "効果音", description: "ボタン操作や結果表示の効果音" },
  { key: "bgmEnabled", label: "BGM", description: "対戦中の背景音楽" },
  { key: "vibrationEnabled", label: "振動", description: "選択確定時などの振動フィードバック" },
  { key: "reducedMotion", label: "演出軽減", description: "アニメーションを短縮・簡略化します" },
  { key: "showBotTag", label: "BOT表記", description: "対戦相手がBOTであることを表示します" },
];

const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
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
                    <SwitchToggle checked={preferences[item.key]} onChange={() => toggle(item.key)} label={item.label} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">アカウント</h2>
              <Card>
                <CardContent className="flex flex-col divide-y divide-arena-border py-0">
                  <Link href="/settings/password" className="flex items-center justify-between py-3 pt-3.5 text-sm text-arena-white">
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-arena-primary-soft" />
                      パスワード変更
                    </span>
                    <ChevronRight className="h-4 w-4 text-arena-silver/60" />
                  </Link>
                  <Link href="/settings/blocked" className="flex items-center justify-between py-3 pb-3.5 text-sm text-arena-white">
                    <span className="flex items-center gap-2">
                      <ShieldOff className="h-4 w-4 text-arena-primary-soft" />
                      ブロック中のユーザー
                    </span>
                    <ChevronRight className="h-4 w-4 text-arena-silver/60" />
                  </Link>
                </CardContent>
              </Card>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">サポート</h2>
              <Link
                href="/support/contact"
                className="flex items-center justify-between rounded-2xl border border-arena-border bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-arena-white transition-colors hover:border-arena-primary/40"
              >
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-arena-primary-soft" />
                  お問い合わせ
                </span>
                <ChevronRight className="h-4 w-4 text-arena-silver/60" />
              </Link>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">利用規約・プライバシー</h2>
              <Card>
                <CardContent className="flex flex-col divide-y divide-arena-border py-0">
                  {LEGAL_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      className="flex items-center justify-between py-3 text-sm text-arena-white first:pt-3.5 last:pb-3.5"
                    >
                      {link.label}
                      <ChevronRight className="h-4 w-4 text-arena-silver/60" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>

            <Button variant="danger" onClick={() => signOut({ callbackUrl: "/login" })}>
              ログアウト
            </Button>

            <DeleteAccountSection />
          </>
        )}
      </div>
    </AppScreen>
  );
}

function DeleteAccountSection() {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiClient.post("/api/account/deactivate", { password });
      await signOut({ callbackUrl: "/login" });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "退会処理に失敗しました。");
      setDeleting(false);
    }
  }

  return (
    <section className="mt-4 flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-arena-danger">
        <ShieldAlert className="h-3.5 w-3.5" />
        アカウント
      </h2>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-2xl border border-arena-danger/30 bg-arena-danger/5 px-4 py-3.5 text-left text-sm font-medium text-arena-danger"
        >
          退会する
        </button>
      ) : (
        <Card className="border-arena-danger/40">
          <CardContent className="flex flex-col gap-3 py-3.5">
            <p className="text-xs leading-relaxed text-arena-silver">
              退会すると、このアカウントではログインできなくなります。表示名は「退会したユーザー」に置き換わり、対戦履歴などの記録は他の利用者の記録保護のため匿名化された状態で残る場合があります。この操作は取り消せません。
            </p>
            {!confirming ? (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                内容を確認して退会する
              </Button>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-arena-silver">確認のためパスワードを入力してください</span>
                  <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                {error && <p className="text-xs text-arena-danger">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setExpanded(false)} disabled={deleting}>
                    キャンセル
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={handleConfirmDelete} disabled={deleting}>
                    {deleting ? "処理中…" : "退会する"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function SwitchToggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-arena-gold" : "bg-arena-surface-2 border border-arena-border"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
