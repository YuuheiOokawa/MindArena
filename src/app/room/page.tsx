"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeagueBadgeIcon } from "@/components/common/league-badge-icon";
import { validateRoomLayout, type OwnedFurnitureInfo, type PlacementInput } from "@/domain/services/room-layout.service";
import { FURNITURE_CATEGORY_ICON, getFurnitureSwatch } from "@/config/furniture-visuals";
import type { FurnitureCategory } from "@/config/furniture";
import { cn } from "@/lib/utils/cn";
import { Coins, Check, Lock, DoorOpen, RotateCw, Trash2, Save, ShoppingBag, ArrowUpCircle } from "lucide-react";

interface RoomTypeCatalogEntry {
  id: string;
  code: string;
  name: string;
  capacity: number;
  purchasePrice: number;
  upgradePrice: number;
  width: number;
  height: number;
  sortOrder: number;
  requiredLeague: { id: string; displayName: string; themeKey: string };
  leagueUnlocked: boolean;
  isCurrent: boolean;
  alreadyOwned: boolean;
}

interface MyRoom {
  id: string;
  roomType: { id: string; code: string; name: string; width: number; height: number; capacity: number };
  placementCount: number;
  prizeCurrency: number;
  nextUpgrade: { id: string; name: string; capacity: number; upgradePrice: number; leagueUnlocked: boolean; requiredLeagueName: string } | null;
}

interface OwnedFurniture {
  id: string;
  shopItemId: string;
  name: string;
  category: FurnitureCategory;
  rarity: string;
  width: number;
  height: number;
  colorKey: string;
  quantity: number;
}

interface Placement {
  id: string;
  ownedFurnitureId: string;
  shopItemId: string;
  name: string;
  width: number;
  height: number;
  colorKey: string;
  positionX: number;
  positionY: number;
  rotation: 0 | 90 | 180 | 270;
}

export default function RoomPage() {
  const [loading, setLoading] = useState(true);
  const [myRoom, setMyRoom] = useState<MyRoom | null>(null);
  const [catalog, setCatalog] = useState<RoomTypeCatalogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [room, types] = await Promise.all([apiClient.get<MyRoom | null>("/api/rooms/me"), apiClient.get<RoomTypeCatalogEntry[]>("/api/rooms/types")]);
      setMyRoom(room);
      setCatalog(types);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "部屋情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiClient.get<MyRoom | null>("/api/rooms/me"), apiClient.get<RoomTypeCatalogEntry[]>("/api/rooms/types")])
      .then(([room, types]) => {
        if (cancelled) return;
        setMyRoom(room);
        setCatalog(types);
      })
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "部屋情報の取得に失敗しました。"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchaseRoom() {
    setBusy(true);
    try {
      await apiClient.post("/api/rooms/purchase");
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "購入に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpgradeRoom() {
    setBusy(true);
    try {
      await apiClient.post("/api/rooms/upgrade");
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "増築に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AppScreen nav><LoadingState label="部屋を確認しています…" /></AppScreen>;
  if (error && !myRoom && !catalog) return <AppScreen nav><ErrorState message={error} onRetry={loadAll} /></AppScreen>;

  if (!myRoom) {
    return (
      <AppScreen nav>
        <RoomPurchaseView catalog={catalog ?? []} onPurchase={handlePurchaseRoom} busy={busy} error={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen nav>
      <MyRoomView room={myRoom} onUpgrade={handleUpgradeRoom} busy={busy} error={error} onRefresh={loadAll} />
    </AppScreen>
  );
}

function RoomPurchaseView({
  catalog,
  onPurchase,
  busy,
  error,
}: {
  catalog: RoomTypeCatalogEntry[];
  onPurchase: () => void;
  busy: boolean;
  error: string | null;
}) {
  const sorted = [...catalog].sort((a, b) => a.sortOrder - b.sortOrder);
  const smallRoom = sorted.find((r) => r.code === "SMALL");

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-arena-primary/40 bg-arena-primary/10">
          <DoorOpen className="h-8 w-8 text-arena-primary-soft" />
        </div>
        <h1 className="mt-3 text-lg font-bold text-arena-white">マイルームを手に入れよう</h1>
        <p className="mt-1 text-xs text-arena-silver/70">賞金で家具を買って、自分だけの部屋を作れます。</p>
      </div>

      {error && <p className="text-center text-xs text-arena-danger">{error}</p>}

      {smallRoom && (
        <Card className="border-arena-gold/30 bg-gradient-to-b from-arena-gold/10 to-transparent">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-semibold text-arena-white">{smallRoom.name}を購入する</p>
            <p className="text-[11px] text-arena-silver/60">
              {smallRoom.width}×{smallRoom.height} ・ 家具{smallRoom.capacity}個まで配置可能
            </p>
            <Button variant="gold" onClick={onPurchase} disabled={busy || !smallRoom.leagueUnlocked}>
              <Coins className="h-4 w-4" />
              {smallRoom.purchasePrice.toLocaleString()} 賞金で購入
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-arena-silver">部屋のサイズ一覧（プレビュー）</h2>
        {sorted.map((room) => (
          <Card key={room.id} className={cn(!room.leagueUnlocked && "opacity-70")}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-arena-white">{room.name}</p>
                <p className="text-[11px] text-arena-silver/60">
                  {room.width}×{room.height} ・ 家具{room.capacity}個まで
                </p>
              </div>
              <div className="text-right">
                <Badge variant={room.leagueUnlocked ? "primary" : "neutral"} className="gap-1">
                  {!room.leagueUnlocked && <Lock className="h-3 w-3" />}
                  <LeagueBadgeIcon themeKey={room.requiredLeague.themeKey} />
                  {room.requiredLeague.displayName}
                </Badge>
                <p className="mt-1 text-[10px] text-arena-silver/50">
                  {room.code === "SMALL" ? `購入 ${room.purchasePrice.toLocaleString()}` : `増築 ${room.upgradePrice.toLocaleString()}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const CELL_MIN = 28;
const CELL_MAX = 56;
const GRID_MAX_WIDTH = 340;

function MyRoomView({
  room,
  onUpgrade,
  busy,
  error: loadError,
  onRefresh,
}: {
  room: MyRoom;
  onUpgrade: () => void;
  busy: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [owned, setOwned] = useState<OwnedFurniture[] | null>(null);
  const [armedOwnedId, setArmedOwnedId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadEditorData() {
    try {
      const [p, o] = await Promise.all([
        apiClient.get<Placement[]>("/api/rooms/placements"),
        apiClient.get<OwnedFurniture[]>("/api/furniture/owned"),
      ]);
      setPlacements(p);
      setOwned(o);
    } catch (e) {
      setLocalError(e instanceof ApiClientError ? e.message : "家具情報の取得に失敗しました。");
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiClient.get<Placement[]>("/api/rooms/placements"), apiClient.get<OwnedFurniture[]>("/api/furniture/owned")])
      .then(([p, o]) => {
        if (cancelled) return;
        setPlacements(p);
        setOwned(o);
      })
      .catch((e) => !cancelled && setLocalError(e instanceof ApiClientError ? e.message : "家具情報の取得に失敗しました。"));
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const cellSize = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(GRID_MAX_WIDTH / room.roomType.width)));

  const ownedInfoMap = useMemo(() => {
    const map = new Map<string, OwnedFurnitureInfo>();
    (owned ?? []).forEach((o) => map.set(o.id, { width: o.width, height: o.height, quantity: o.quantity }));
    return map;
  }, [owned]);

  const placedCountByOwnedId = useMemo(() => {
    const map = new Map<string, number>();
    (placements ?? []).forEach((p) => map.set(p.ownedFurnitureId, (map.get(p.ownedFurnitureId) ?? 0) + 1));
    return map;
  }, [placements]);

  function footprint(width: number, height: number, rotation: number) {
    return rotation === 90 || rotation === 270 ? { w: height, h: width } : { w: width, h: height };
  }

  function tryPlace(x: number, y: number) {
    if (!placements || !armedOwnedId || !owned) return;
    const item = owned.find((o) => o.id === armedOwnedId);
    if (!item) return;

    const candidate: PlacementInput[] = [
      ...placements.map((p) => ({ ownedFurnitureId: p.ownedFurnitureId, positionX: p.positionX, positionY: p.positionY, rotation: p.rotation })),
      { ownedFurnitureId: armedOwnedId, positionX: x, positionY: y, rotation: 0 },
    ];
    const validation = validateRoomLayout({ width: room.roomType.width, height: room.roomType.height, capacity: room.roomType.capacity }, ownedInfoMap, candidate);
    if (!validation.valid) {
      setLocalError(describeLayoutError(validation.error));
      return;
    }
    setLocalError(null);
    setPlacements([
      ...placements,
      { id: `local-${Date.now()}-${Math.random()}`, ownedFurnitureId: armedOwnedId, shopItemId: item.shopItemId, name: item.name, width: item.width, height: item.height, colorKey: item.colorKey, positionX: x, positionY: y, rotation: 0 },
    ]);
    setArmedOwnedId(null);
  }

  function rotateSelected() {
    if (!placements || !selectedPlacementId) return;
    const next = placements.map((p) => (p.id === selectedPlacementId ? { ...p, rotation: (((p.rotation + 90) % 360) as 0 | 90 | 180 | 270) } : p));
    const candidate: PlacementInput[] = next.map((p) => ({ ownedFurnitureId: p.ownedFurnitureId, positionX: p.positionX, positionY: p.positionY, rotation: p.rotation }));
    const validation = validateRoomLayout({ width: room.roomType.width, height: room.roomType.height, capacity: room.roomType.capacity }, ownedInfoMap, candidate);
    if (!validation.valid) {
      setLocalError(describeLayoutError(validation.error));
      return;
    }
    setLocalError(null);
    setPlacements(next);
  }

  function removeSelected() {
    if (!placements || !selectedPlacementId) return;
    setPlacements(placements.filter((p) => p.id !== selectedPlacementId));
    setSelectedPlacementId(null);
  }

  async function handleSave() {
    if (!placements) return;
    setSaving(true);
    try {
      await apiClient.post("/api/rooms/placements", {
        placements: placements.map((p) => ({ ownedFurnitureId: p.ownedFurnitureId, positionX: p.positionX, positionY: p.positionY, rotation: p.rotation })),
      });
      setLocalError(null);
      setEditing(false);
      setSelectedPlacementId(null);
      await onRefresh();
      await loadEditorData();
    } catch (e) {
      setLocalError(e instanceof ApiClientError ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  const occupied = useMemo(() => {
    const map = new Map<string, string>(); // "x,y" -> placement id
    (placements ?? []).forEach((p) => {
      const { w, h } = footprint(p.width, p.height, p.rotation);
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          map.set(`${p.positionX + dx},${p.positionY + dy}`, p.id);
        }
      }
    });
    return map;
  }, [placements]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-arena-white">{room.roomType.name}</h1>
          <p className="text-[11px] text-arena-silver/60">
            家具 {room.placementCount}/{room.roomType.capacity}
          </p>
        </div>
        <div className="flex items-center gap-1 text-right">
          <Coins className="h-4 w-4 text-arena-gold" />
          <span className="text-sm font-bold tabular-nums text-arena-gold">{room.prizeCurrency.toLocaleString()}</span>
        </div>
      </header>

      {(loadError || localError) && <p className="text-xs text-arena-danger">{localError ?? loadError}</p>}

      <Card className="overflow-hidden border-arena-primary/25">
        <CardContent className="flex flex-col items-center gap-3 py-4">
          <div
            className="grid gap-0.5 rounded-lg border border-arena-border bg-arena-surface-2/60 p-1"
            style={{ gridTemplateColumns: `repeat(${room.roomType.width}, ${cellSize}px)`, gridTemplateRows: `repeat(${room.roomType.height}, ${cellSize}px)` }}
          >
            {Array.from({ length: room.roomType.width * room.roomType.height }).map((_, i) => {
              const x = i % room.roomType.width;
              const y = Math.floor(i / room.roomType.width);
              const placementIdHere = occupied.get(`${x},${y}`);
              const placement = placementIdHere ? placements?.find((p) => p.id === placementIdHere) : null;
              const isAnchor = placement && placement.positionX === x && placement.positionY === y;
              if (placementIdHere && !isAnchor) return <div key={i} />; // covered by another cell's spanning render

              if (placement && isAnchor) {
                const { w, h } = footprint(placement.width, placement.height, placement.rotation);
                const CategoryIcon = FURNITURE_CATEGORY_ICON.DESK; // placeholder generic icon (shop card shows the real category icon)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!editing}
                    onClick={() => setSelectedPlacementId(placement.id === selectedPlacementId ? null : placement.id)}
                    style={{ gridColumn: `${x + 1} / span ${w}`, gridRow: `${y + 1} / span ${h}` }}
                    className={cn(
                      "flex items-center justify-center rounded-md bg-gradient-to-br text-white/90",
                      getFurnitureSwatch(placement.colorKey),
                      selectedPlacementId === placement.id && "ring-2 ring-arena-gold",
                    )}
                    title={placement.name}
                  >
                    <CategoryIcon className="h-4 w-4" />
                  </button>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={!editing || !armedOwnedId}
                  onClick={() => tryPlace(x, y)}
                  className="rounded-md border border-dashed border-arena-border/60 disabled:cursor-default"
                />
              );
            })}
          </div>

          {editing && selectedPlacementId && (
            <div className="flex w-full items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={rotateSelected}>
                <RotateCw className="h-3.5 w-3.5" />
                回転
              </Button>
              <Button variant="danger" size="sm" onClick={removeSelected}>
                <Trash2 className="h-3.5 w-3.5" />
                撤去
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-arena-silver">所持家具（タップして選択→空きマスをタップで配置）</h2>
            {!owned ? (
              <LoadingState />
            ) : owned.length === 0 ? (
              <p className="text-xs text-arena-silver/60">まだ家具を所持していません。ショップで購入しましょう。</p>
            ) : (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {owned.map((item) => {
                  const remaining = item.quantity - (placedCountByOwnedId.get(item.id) ?? 0);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={remaining <= 0}
                      onClick={() => setArmedOwnedId(armedOwnedId === item.id ? null : item.id)}
                      className={cn(
                        "flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center",
                        armedOwnedId === item.id ? "border-arena-gold bg-arena-gold/10" : "border-arena-border",
                        remaining <= 0 && "opacity-40",
                      )}
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br", getFurnitureSwatch(item.colorKey))}>
                        {(() => {
                          const Icon = FURNITURE_CATEGORY_ICON[item.category];
                          return <Icon className="h-4 w-4 text-white/90" />;
                        })()}
                      </div>
                      <span className="max-w-16 truncate text-[10px] text-arena-white">{item.name}</span>
                      <span className="text-[9px] text-arena-silver/50">残{Math.max(0, remaining)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving} className="flex-1">
              キャンセル
            </Button>
            <Button variant="gold" onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4" />
              {saving ? "保存中…" : "保存する"}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Button variant="gold" onClick={() => setEditing(true)}>
            家具を配置・編集する
          </Button>
          {room.nextUpgrade && (
            <Button variant="secondary" onClick={onUpgrade} disabled={busy || !room.nextUpgrade.leagueUnlocked || room.prizeCurrency < room.nextUpgrade.upgradePrice}>
              <ArrowUpCircle className="h-4 w-4" />
              {room.nextUpgrade.name}へ増築（{room.nextUpgrade.upgradePrice.toLocaleString()}）
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href="/shop">
              <ShoppingBag className="h-4 w-4" />
              ショップで家具を探す
            </Link>
          </Button>
        </div>
      )}

      {!editing && room.nextUpgrade && !room.nextUpgrade.leagueUnlocked && (
        <p className="text-center text-[11px] text-arena-silver/60">
          <Lock className="mr-1 inline h-3 w-3" />
          増築には「{room.nextUpgrade.requiredLeagueName}」への到達が必要です。
        </p>
      )}
      {!editing && !room.nextUpgrade && (
        <p className="flex items-center justify-center gap-1 text-center text-[11px] text-arena-gold">
          <Check className="h-3.5 w-3.5" />
          すでに最大サイズの部屋です。
        </p>
      )}
    </div>
  );
}

function describeLayoutError(error: string | undefined): string {
  switch (error) {
    case "OVER_CAPACITY":
      return "これ以上家具を配置できません（配置上限に達しています）。";
    case "OVERLAP":
      return "その場所にはすでに別の家具があります。";
    case "OUT_OF_BOUNDS":
      return "部屋の範囲外には配置できません。";
    case "OVER_OWNED_QUANTITY":
      return "所持している数を超えて配置することはできません。";
    default:
      return "この配置はできません。";
  }
}
