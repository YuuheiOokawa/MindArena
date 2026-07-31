import type { EventConfig, EventMilestoneConfig } from "@/config/events";

export function isEventActive(event: Pick<EventConfig, "startAt" | "endAt">, now: Date): boolean {
  return now >= event.startAt && now <= event.endAt;
}

export function isEventUpcoming(event: Pick<EventConfig, "startAt">, now: Date): boolean {
  return now < event.startAt;
}

export function isEventEnded(event: Pick<EventConfig, "endAt">, now: Date): boolean {
  return now > event.endAt;
}

export function isMilestoneClaimable(milestone: EventMilestoneConfig, score: number, alreadyClaimed: boolean): boolean {
  return !alreadyClaimed && score >= milestone.requiredScore;
}
