import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { getEventDetail } from "@/features/events/event.service";
import { AppScreen } from "@/components/layout/app-screen";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventMilestoneList } from "@/components/events/event-milestone-list";
import { Swords, Trophy } from "lucide-react";

const STATUS_LABEL = { ACTIVE: "開催中", UPCOMING: "開催予定", ENDED: "終了" } as const;
const STATUS_VARIANT = { ACTIVE: "success", UPCOMING: "primary", ENDED: "neutral" } as const;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
}

function remainingLabel(status: "ACTIVE" | "UPCOMING" | "ENDED", startAt: Date, endAt: Date): string {
  if (status === "ENDED") return "イベントは終了しました";
  const target = status === "UPCOMING" ? new Date(startAt) : new Date(endAt);
  const days = Math.max(0, Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return status === "UPCOMING" ? `開始まであと${days}日` : `終了まであと${days}日`;
}

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const event = await getEventDetail(session.user.id, eventId);

  return (
    <AppScreen header={<FocusHeader title={event.name} backHref="/events" />}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[event.status]}>{STATUS_LABEL[event.status]}</Badge>
          <span className="text-xs text-arena-silver/70">
            {formatDate(event.startAt)} 〜 {formatDate(event.endAt)}
          </span>
        </div>
        <p className="text-sm text-arena-silver">{event.description}</p>
        <p className="text-xs font-medium text-arena-primary-soft">{remainingLabel(event.status, event.startAt, event.endAt)}</p>

        <Card className="border-arena-primary/25 bg-arena-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Swords className="h-6 w-6 shrink-0 text-arena-primary-soft" />
            <div>
              <p className="text-xs text-arena-silver/70">イベント期間中の勝利数</p>
              <p className="text-2xl font-bold tabular-nums text-arena-white">{event.myScore.toLocaleString()} 勝</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs font-semibold text-arena-silver">マイルストーン報酬</p>
          <EventMilestoneList eventId={event.id} milestones={event.milestones} />
        </div>

        {event.leaderboard.entries.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-arena-silver">
              <Trophy className="h-3.5 w-3.5 text-arena-gold-soft" />
              ランキング TOP{event.leaderboard.entries.length}
            </p>
            <Card>
              <CardContent className="flex flex-col gap-1 py-3">
                {event.leaderboard.entries.map((entry) => (
                  <div
                    key={entry.playerProfileId}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${entry.isMe ? "bg-arena-primary/10 text-arena-white" : "text-arena-silver"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-arena-gold-soft">{entry.rank}</span>
                      <span className="truncate">{entry.displayName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold">{entry.score.toLocaleString()} 勝</span>
                  </div>
                ))}
                {event.leaderboard.myRank && !event.leaderboard.entries.some((e) => e.isMe) && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-arena-primary/10 px-2 py-1.5 text-sm text-arena-white">
                    <span className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-arena-gold-soft">{event.leaderboard.myRank}</span>
                      <span className="truncate">自分</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold">{event.myScore.toLocaleString()} 勝</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppScreen>
  );
}
