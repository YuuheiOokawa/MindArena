"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BACKGROUND_GRADIENTS, BADGE_ICON_KEYS } from "@/config/shop-items";
import { FURNITURE_CATEGORY_ICON, FURNITURE_CATEGORY_LABEL, FURNITURE_RARITY_BADGE_VARIANT, FURNITURE_RARITY_LABEL, getFurnitureSwatch } from "@/config/furniture-visuals";
import type { FurnitureCategory } from "@/config/furniture";
import { cn } from "@/lib/utils/cn";
import { Coins, Check, Lock, Flame, Star, Skull, Gem, Crown, Zap, Shield, Eye, Target, Compass, ShoppingBag, Trophy, DoorOpen } from "lucide-react";

const BADGE_ICONS: Record<string, typeof Flame> = { Flame, Star, Skull, Gem, Crown, Zap, Shield, Eye, Target, Compass };

const FURNITURE_CATEGORIES = Object.keys(FURNITURE_CATEGORY_LABEL) as FurnitureCategory[];

interface FurnitureShopItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FurnitureCategory;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price: number;
  colorKey: string;
  stackable: boolean;
  requiredLeague: { displayName: string; themeKey: string } | null;
  leagueUnlocked: boolean;
  owned: boolean;
  ownedQuantity: number;
  canPurchase: boolean;
}

interface FurnitureCatalog {
  prizeCurrency: number;
  items: FurnitureShopItem[];
}

interface ShopItem {
  id: string;
  code: string;
  name: string;
  category: "BACKGROUND" | "BADGE" | "TITLE";
  price: number;
  assetKey: string;
  owned: boolean;
}

interface ShopCatalog {
  prizeCurrency: number;
  lifetimePrizeCurrency: number;
  items: ShopItem[];
  selectedBackgroundId: string | null;
  selectedBadgeId: string | null;
}

export default function ShopPage() {
  const [tab, setTab] = useState<"cosmetics" | "furniture">("cosmetics");
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [furniture, setFurniture] = useState<FurnitureCatalog | null>(null);
  const [furnitureError, setFurnitureError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FurnitureCategory | "ALL">("ALL");
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

  async function loadFurniture() {
    try {
      const data = await apiClient.get<FurnitureCatalog>("/api/furniture");
      setFurniture(data);
      setFurnitureError(null);
    } catch (e) {
      setFurnitureError(e instanceof ApiClientError ? e.message : "家具の取得に失敗しました。");
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<ShopCatalog>("/api/shop")
      .then((data) => !cancelled && setCatalog(data))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "ショップの取得に失敗しました。"));
    apiClient
      .get<FurnitureCatalog>("/api/furniture")
      .then((data) => !cancelled && setFurniture(data))
      .catch((e) => !cancelled && setFurnitureError(e instanceof ApiClientError ? e.message : "家具の取得に失敗しました。"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchaseFurniture(itemId: string) {
    setBusyId(itemId);
    try {
      await apiClient.post("/api/furniture/purchase", { itemId });
      // Both catalogs read the same prizeCurrency wallet — refresh both so the header stays
      // correct no matter which tab the player switches back to.
      await Promise.all([loadFurniture(), load()]);
    } catch (e) {
      setFurnitureError(e instanceof ApiClientError ? e.message : "購入に失敗しました。");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurchase(itemId: string) {
    setBusyId(itemId);
    try {
      await apiClient.post("/api/shop/purchase", { itemId });
      await Promise.all([load(), loadFurniture()]);
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
  const titles = catalog.items.filter((i) => i.category === "TITLE");

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
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-[10px] text-arena-silver/50">
                <Trophy className="h-3 w-3" />
                生涯獲得 {catalog.lifetimePrizeCurrency.toLocaleString()}
              </p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-arena-silver/60">
                <ShoppingBag className="h-3.5 w-3.5" />
                優勝すると賞金を獲得
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex rounded-xl border border-arena-border bg-arena-surface-2/40 p-1">
          <button
            type="button"
            onClick={() => setTab("cosmetics")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
              tab === "cosmetics" ? "bg-arena-primary/20 text-arena-primary-soft" : "text-arena-silver/60",
            )}
          >
            プロフィール
          </button>
          <button
            type="button"
            onClick={() => setTab("furniture")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
              tab === "furniture" ? "bg-arena-primary/20 text-arena-primary-soft" : "text-arena-silver/60",
            )}
          >
            部屋・家具
          </button>
        </div>

        {tab === "cosmetics" && (
          <>
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

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-arena-silver">称号</h2>
              <div className="flex flex-col gap-2">
                {titles.map((item) => (
                  <TitleCard
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    canAfford={catalog.prizeCurrency >= item.price}
                    onPurchase={() => handlePurchase(item.id)}
                  />
                ))}
              </div>
              <Card>
                <CardContent className="py-3">
                  <p className="text-[11px] text-arena-silver/70">購入した称号は「プロフィール編集」から装備できます。</p>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {tab === "furniture" && (
          <>
            <Link
              href="/room"
              className="flex items-center justify-between rounded-xl border border-arena-primary/30 bg-arena-primary/10 px-4 py-3 text-sm font-medium text-arena-white"
            >
              <span className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-arena-primary-soft" />
                マイルームで配置する
              </span>
              <span className="text-arena-silver/60">›</span>
            </Link>

            {furnitureError && <p className="text-xs text-arena-danger">{furnitureError}</p>}
            {!furniture ? (
              <LoadingState />
            ) : (
              <>
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
                  <CategoryChip label="すべて" active={categoryFilter === "ALL"} onClick={() => setCategoryFilter("ALL")} />
                  {FURNITURE_CATEGORIES.map((cat) => (
                    <CategoryChip key={cat} label={FURNITURE_CATEGORY_LABEL[cat]} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)} />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {furniture.items
                    .filter((item) => categoryFilter === "ALL" || item.category === categoryFilter)
                    .map((item) => (
                      <FurnitureCard key={item.id} item={item} busy={busyId === item.id} onPurchase={() => handlePurchaseFurniture(item.id)} />
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppScreen>
  );
}

function TitleCard({
  item,
  busy,
  canAfford,
  onPurchase,
}: {
  item: ShopItem;
  busy: boolean;
  canAfford: boolean;
  onPurchase: () => void;
}) {
  return (
    <Card className={item.owned ? "border-arena-primary/40" : ""}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arena-gold/40 bg-arena-gold/10">
            <Crown className="h-4 w-4 text-arena-gold" />
          </div>
          <p className="truncate text-xs font-semibold text-arena-white">{item.name}</p>
        </div>
        {item.owned ? (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-arena-success">
            <Check className="h-3.5 w-3.5" />
            所持中
          </span>
        ) : (
          <Button variant="secondary" size="sm" onClick={onPurchase} disabled={busy || !canAfford} className="shrink-0">
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
        )}
      </CardContent>
    </Card>
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

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors",
        active ? "border-arena-primary/50 bg-arena-primary/15 text-arena-primary-soft" : "border-arena-border text-arena-silver/70",
      )}
    >
      {label}
    </button>
  );
}

function FurnitureCard({ item, busy, onPurchase }: { item: FurnitureShopItem; busy: boolean; onPurchase: () => void }) {
  const CategoryIcon = FURNITURE_CATEGORY_ICON[item.category];
  const blockedReason = !item.leagueUnlocked
    ? `必要リーグ: ${item.requiredLeague?.displayName ?? ""}`
    : !item.canPurchase && !item.owned
      ? "賞金が不足しています"
      : null;

  return (
    <Card className={cn("overflow-hidden", item.owned && !item.stackable && "border-arena-success/30")}>
      <div className={cn("flex h-16 items-center justify-center bg-gradient-to-br", getFurnitureSwatch(item.colorKey))}>
        <CategoryIcon className="h-6 w-6 text-white/80" />
      </div>
      <CardContent className="flex flex-col gap-1.5 py-3">
        <div className="flex items-start justify-between gap-1">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-arena-white">{item.name}</p>
          <Badge variant={FURNITURE_RARITY_BADGE_VARIANT[item.rarity]} className="shrink-0 px-1.5 py-0.5 text-[9px]">
            {FURNITURE_RARITY_LABEL[item.rarity]}
          </Badge>
        </div>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-arena-silver/60">{item.description}</p>

        {item.owned && (
          <span className="flex items-center gap-1 text-[10px] text-arena-success">
            <Check className="h-3 w-3" />
            所持済み{item.stackable && `（${item.ownedQuantity}）`}
          </span>
        )}

        {(!item.owned || item.stackable) && (
          <Button variant="secondary" size="sm" onClick={onPurchase} disabled={busy || !item.canPurchase} className="w-full">
            {!item.leagueUnlocked ? (
              <>
                <Lock className="h-3 w-3" />
                リーグ不足
              </>
            ) : !item.canPurchase ? (
              <>
                <Lock className="h-3 w-3" />
                不足
              </>
            ) : (
              <>
                <Coins className="h-3 w-3 text-arena-gold" />
                {item.price.toLocaleString()}
              </>
            )}
          </Button>
        )}
        {blockedReason && !item.owned && <p className="text-center text-[9px] text-arena-danger/80">{blockedReason}</p>}
      </CardContent>
    </Card>
  );
}
