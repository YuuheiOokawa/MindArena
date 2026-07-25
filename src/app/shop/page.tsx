"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BACKGROUND_GRADIENTS, BADGE_ICON_KEYS } from "@/config/shop-items";
import { cn } from "@/lib/utils/cn";
import { Coins, Check, Lock, Flame, Star, Skull, Gem, Crown, Zap, Shield, Eye, ShoppingBag } from "lucide-react";

const BADGE_ICONS: Record<string, typeof Flame> = { Flame, Star, Skull, Gem, Crown, Zap, Shield, Eye };

interface ShopItem {
  id: string;
  code: string;
  name: string;
  category: "BACKGROUND" | "BADGE";
  price: number;
  assetKey: string;
  owned: boolean;
}

interface ShopCatalog {
  prizeCurrency: number;
  items: ShopItem[];
  selectedBackgroundId: string | null;
  selectedBadgeId: string | null;
}

export default function ShopPage() {
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiClient.get<ShopCatalog>("/api/shop");
      setCatalog(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "ショップの取得に失敗しました。");
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<ShopCatalog>("/api/shop")
      .then((data) => !cancelled && setCatalog(data))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "ショップの取得に失敗しました。"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchase(itemId: string) {
    setBusyId(itemId);
    try {
      await apiClient.post("/api/shop/purchase", { itemId });
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "購入に失敗しました。");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(category: "BACKGROUND" | "BADGE", itemId: string | null) {
    setBusyId(itemId ?? `unequip-${category}`);
    try {
      await apiClient.post("/api/shop/equip", { category, itemId });
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "装備に失敗しました。");
    } finally {
      setBusyId(null);
    }
  }

  if (error && !catalog) return <AppScreen nav header={<FocusHeader title="ショップ" backHref="/profile" />}><ErrorState message={error} onRetry={load} /></AppScreen>;
  if (!catalog) return <AppScreen nav header={<FocusHeader title="ショップ" backHref="/profile" />}><LoadingState /></AppScreen>;

  const backgrounds = catalog.items.filter((i) => i.category === "BACKGROUND");
  const badges = catalog.items.filter((i) => i.category === "BADGE");

  return (
    <AppScreen nav header={<FocusHeader title="ショップ" backHref="/profile" />}>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        <Card className="border-arena-gold/30 bg-gradient-to-b from-arena-gold/10 to-transparent">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-arena-gold/40 bg-arena-gold/10">
                <Coins className="h-5 w-5 text-arena-gold" />
              </div>
              <div>
                <p className="text-[11px] text-arena-silver/70">所持賞金</p>
                <p className="text-xl font-bold tabular-nums text-arena-gold">{catalog.prizeCurrency.toLocaleString()}</p>
              </div>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-arena-silver/60">
              <ShoppingBag className="h-3.5 w-3.5" />
              優勝すると賞金を獲得
            </p>
          </CardContent>
        </Card>

        {error && <p className="text-xs text-arena-danger">{error}</p>}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">背景</h2>
          <div className="grid grid-cols-2 gap-2">
            {backgrounds.map((item) => (
              <BackgroundCard
                key={item.id}
                item={item}
                equipped={catalog.selectedBackgroundId === item.id}
                busy={busyId === item.id || busyId === `unequip-BACKGROUND`}
                canAfford={catalog.prizeCurrency >= item.price}
                onPurchase={() => handlePurchase(item.id)}
                onEquip={() => handleEquip("BACKGROUND", catalog.selectedBackgroundId === item.id ? null : item.id)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-arena-silver">バッジ</h2>
          <div className="grid grid-cols-2 gap-2">
            {badges.map((item) => (
              <BadgeCard
                key={item.id}
                item={item}
                equipped={catalog.selectedBadgeId === item.id}
                busy={busyId === item.id || busyId === `unequip-BADGE`}
                canAfford={catalog.prizeCurrency >= item.price}
                onPurchase={() => handlePurchase(item.id)}
                onEquip={() => handleEquip("BADGE", catalog.selectedBadgeId === item.id ? null : item.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </AppScreen>
  );
}

function BackgroundCard({
  item,
  equipped,
  busy,
  canAfford,
  onPurchase,
  onEquip,
}: {
  item: ShopItem;
  equipped: boolean;
  busy: boolean;
  canAfford: boolean;
  onPurchase: () => void;
  onEquip: () => void;
}) {
  const gradient = BACKGROUND_GRADIENTS[item.assetKey] ?? "from-arena-primary/20 to-transparent";
  return (
    <Card className={cn("overflow-hidden", equipped && "border-arena-primary")}>
      <div className={cn("h-14 bg-gradient-to-br", gradient)} />
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-arena-white">{item.name}</p>
          {equipped && <Check className="h-3.5 w-3.5 text-arena-primary-soft" />}
        </div>
        <ShopItemAction item={item} equipped={equipped} busy={busy} canAfford={canAfford} onPurchase={onPurchase} onEquip={onEquip} />
      </CardContent>
    </Card>
  );
}

function BadgeCard({
  item,
  equipped,
  busy,
  canAfford,
  onPurchase,
  onEquip,
}: {
  item: ShopItem;
  equipped: boolean;
  busy: boolean;
  canAfford: boolean;
  onPurchase: () => void;
  onEquip: () => void;
}) {
  const IconComponent = BADGE_ICONS[BADGE_ICON_KEYS[item.assetKey]] ?? Star;
  return (
    <Card className={equipped ? "border-arena-primary" : ""}>
      <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-arena-gold/40 bg-arena-gold/10">
          <IconComponent className="h-6 w-6 text-arena-gold" />
        </div>
        <p className="text-xs font-semibold text-arena-white">{item.name}</p>
        <ShopItemAction item={item} equipped={equipped} busy={busy} canAfford={canAfford} onPurchase={onPurchase} onEquip={onEquip} />
      </CardContent>
    </Card>
  );
}

function ShopItemAction({
  item,
  equipped,
  busy,
  canAfford,
  onPurchase,
  onEquip,
}: {
  item: ShopItem;
  equipped: boolean;
  busy: boolean;
  canAfford: boolean;
  onPurchase: () => void;
  onEquip: () => void;
}) {
  if (!item.owned) {
    return (
      <Button variant="secondary" size="sm" onClick={onPurchase} disabled={busy || !canAfford} className="w-full">
        {!canAfford ? (
          <>
            <Lock className="h-3 w-3" />
            不足
          </>
        ) : (
          <>
            <Coins className="h-3 w-3 text-arena-gold" />
            {item.price}
          </>
        )}
      </Button>
    );
  }
  return (
    <Button variant={equipped ? "primary" : "secondary"} size="sm" onClick={onEquip} disabled={busy} className="w-full">
      {equipped ? "装備中" : "装備する"}
    </Button>
  );
}
