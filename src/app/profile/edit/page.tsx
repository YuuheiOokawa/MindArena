"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { PlayerAvatar } from "@/components/common/player-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Camera, X } from "lucide-react";
import { TITLES } from "@/config/titles";
import { AVATAR_ICONS } from "@/config/avatar-icons";
import { cn } from "@/lib/utils/cn";
import { resizeImageToSquareDataUrl } from "@/lib/utils/resize-image";

interface EditableProfile {
  displayName: string;
  selectedTitleId: string | null;
  selectedAvatarIconId: string | null;
  customAvatarUrl: string | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState<string>(TITLES[0].id);
  const [selectedAvatarIconId, setSelectedAvatarIconId] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  useEffect(() => {
    apiClient
      .get<EditableProfile>("/api/profile/me")
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName);
        setSelectedTitleId(data.selectedTitleId ?? TITLES[0].id);
        setSelectedAvatarIconId(data.selectedAvatarIconId);
        setCustomAvatarUrl(data.customAvatarUrl);
      })
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "プロフィールの取得に失敗しました。"));
  }, []);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcessingPhoto(true);
    setError(null);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file);
      setCustomAvatarUrl(dataUrl);
    } catch {
      setError("写真の読み込みに失敗しました。");
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      if (displayName !== profile.displayName) {
        await apiClient.patch("/api/profile/me/display-name", { displayName });
      }
      if (
        selectedTitleId !== (profile.selectedTitleId ?? TITLES[0].id) ||
        selectedAvatarIconId !== profile.selectedAvatarIconId ||
        customAvatarUrl !== profile.customAvatarUrl
      ) {
        await apiClient.patch("/api/profile/me/cosmetics", { selectedTitleId, selectedAvatarIconId, customAvatarUrl });
      }
      router.push("/profile");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  const nameInvalid = displayName.length < 2 || displayName.length > 20;

  return (
    <AppScreen header={<FocusHeader title="プロフィール編集" backHref="/profile" />}>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        {error && <ErrorState message={error} />}
        {!error && !profile && <LoadingState />}
        {profile && (
          <>
            <section className="flex flex-col items-center gap-3">
              <PlayerAvatar
                displayName={displayName || profile.displayName}
                avatarIconId={selectedAvatarIconId}
                photoUrl={customAvatarUrl}
                className="h-20 w-20 text-2xl"
                iconClassName="h-9 w-9"
              />

              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-arena-border bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-arena-white transition-colors hover:border-arena-primary/40">
                  <Camera className="h-3.5 w-3.5 text-arena-primary-soft" />
                  {processingPhoto ? "処理中…" : "写真を選ぶ"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} disabled={processingPhoto} />
                </label>
                {customAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomAvatarUrl(null)}
                    className="flex items-center gap-1 rounded-full border border-arena-border px-3 py-1.5 text-xs text-arena-silver hover:text-arena-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                    写真を削除
                  </button>
                )}
              </div>

              <p className="text-[11px] text-arena-silver/60">または、アイコンから選ぶ</p>

              <div className="grid grid-cols-4 gap-2">
                {AVATAR_ICONS.map((avatar) => {
                  const selected = avatar.id === selectedAvatarIconId;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarIconId(avatar.id);
                        setCustomAvatarUrl(null);
                      }}
                      title={avatar.name}
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full border-2 bg-arena-surface-2 transition-colors",
                        selected ? "border-arena-primary" : "border-arena-border hover:border-arena-primary/40",
                      )}
                    >
                      <PlayerAvatar displayName="" avatarIconId={avatar.id} className="h-full w-full border-0 bg-transparent" iconClassName="h-6 w-6" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-arena-silver">表示名</h2>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名"
                maxLength={20}
              />
              {nameInvalid && <p className="text-xs text-arena-danger">2〜20文字で入力してください。</p>}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-arena-silver">称号</h2>
              <div className="flex flex-col gap-2">
                {TITLES.map((title) => {
                  const selected = title.id === selectedTitleId;
                  return (
                    <button
                      key={title.id}
                      type="button"
                      onClick={() => setSelectedTitleId(title.id)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                        selected ? "border-arena-primary bg-arena-primary/10" : "border-arena-border bg-white/[0.03]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-arena-white">{title.name}</p>
                        <p className="truncate text-[11px] text-arena-silver/70">{title.unlockHint}</p>
                      </div>
                      {selected && <Check className="h-4 w-4 shrink-0 text-arena-primary-soft" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <Card>
              <CardContent className="py-3">
                <p className="text-[11px] text-arena-silver/70">背景・バッジは「ショップ」から購入・装備できます。</p>
              </CardContent>
            </Card>

            <Button variant="gold" onClick={handleSave} disabled={saving || nameInvalid}>
              保存する
            </Button>
          </>
        )}
      </div>
    </AppScreen>
  );
}
