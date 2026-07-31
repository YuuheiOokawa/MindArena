"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, PartyPopper } from "lucide-react";

interface EventSummary {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "UPCOMING" | "ENDED";
  myScore: number;
  claimableCount: number;
}

/** Self-contained, non-critical widget — fails silently and renders nothing if there's no
 * currently-active event, same pattern as DailyMissionsCard. */
export function EventBanner() {
  const [event, setEvent] = useState<EventSummary | null | undefined>(undefined);

  useEffect(() => {
    apiClient
      .get<EventSummary[]>("/api/events")
      .then((events) => setEvent(events.find((e) => e.status === "ACTIVE") ?? null))
      .catch(() => setEvent(null));
  }, []);

  if (!event) return null;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="border-arena-gold/30 bg-gradient-to-br from-arena-gold/10 via-arena-primary/5 to-transparent">
        <CardContent className="flex items-center gap-3 py-4">
          <PartyPopper className="h-6 w-6 shrink-0 text-arena-gold-soft" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-arena-white">{event.name}</p>
              <Badge variant="success" className="shrink-0">
                開催中
              </Badge>
            </div>
            <p className="truncate text-xs text-arena-silver/70">累計 {event.myScore.toLocaleString()} 勝</p>
          </div>
          {event.claimableCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-arena-gold px-2 py-1 text-[10px] font-bold text-arena-bg">
              <Gift className="h-3 w-3" />
              {event.claimableCount}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
