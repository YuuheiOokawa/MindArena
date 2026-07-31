import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { listEvents } from "@/features/events/event.service";
import { AppScreen } from "@/components/layout/app-screen";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { Gift, PartyPopper } from "lucide-react";

const STATUS_LABEL = { ACTIVE: "開催中", UPCOMING: "開催予定", ENDED: "終了" } as const;
const STATUS_VARIANT = { ACTIVE: "success", UPCOMING: "primary", ENDED: "neutral" } as const;

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const events = await listEvents(session.user.id);
  const sorted = [...events].sort((a, b) => {
    const order = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">期間限定イベント</h1>
          <p className="text-xs text-arena-silver">開催期間中の勝利数に応じて報酬がもらえる。</p>
        </header>

        {sorted.length === 0 ? (
          <EmptyState icon={PartyPopper} title="開催中のイベントはありません" description="次のイベント開催をお楽しみに。" />
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className={cn(event.status === "ENDED" && "opacity-60")}>
                  <CardContent className="flex flex-col gap-2 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-arena-white">{event.name}</p>
                      <Badge variant={STATUS_VARIANT[event.status]} className="shrink-0">
                        {STATUS_LABEL[event.status]}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-arena-silver">{event.description}</p>
                    <div className="flex items-center justify-between text-xs text-arena-silver/70">
                      <span>累計 {event.myScore.toLocaleString()} 勝</span>
                      {event.claimableCount > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-arena-gold-soft">
                          <Gift className="h-3.5 w-3.5" />
                          受取可能 {event.claimableCount}件
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
