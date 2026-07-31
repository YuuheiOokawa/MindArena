import { describe, expect, it } from "vitest";
import { isEventActive, isEventEnded, isEventUpcoming, isMilestoneClaimable } from "@/domain/services/event.service";
import type { EventMilestoneConfig } from "@/config/events";

const WINDOW = { startAt: new Date("2026-07-25T00:00:00+09:00"), endAt: new Date("2026-08-17T23:59:59+09:00") };

function milestone(overrides: Partial<EventMilestoneConfig>): EventMilestoneConfig {
  return { code: "TEST", name: "test", requiredScore: 10, rewardPoints: 100, rewardPrizeCurrency: 0, sortOrder: 1, ...overrides };
}

describe("isEventActive / isEventUpcoming / isEventEnded", () => {
  it("classifies a moment before startAt as upcoming, not active", () => {
    const now = new Date("2026-07-01T00:00:00+09:00");
    expect(isEventUpcoming(WINDOW, now)).toBe(true);
    expect(isEventActive(WINDOW, now)).toBe(false);
    expect(isEventEnded(WINDOW, now)).toBe(false);
  });

  it("classifies a moment inside [startAt, endAt] as active", () => {
    const now = new Date("2026-08-01T00:00:00+09:00");
    expect(isEventActive(WINDOW, now)).toBe(true);
    expect(isEventUpcoming(WINDOW, now)).toBe(false);
    expect(isEventEnded(WINDOW, now)).toBe(false);
  });

  it("classifies a moment after endAt as ended", () => {
    const now = new Date("2026-09-01T00:00:00+09:00");
    expect(isEventEnded(WINDOW, now)).toBe(true);
    expect(isEventActive(WINDOW, now)).toBe(false);
  });

  it("treats startAt and endAt themselves as inside the active window (inclusive bounds)", () => {
    expect(isEventActive(WINDOW, WINDOW.startAt)).toBe(true);
    expect(isEventActive(WINDOW, WINDOW.endAt)).toBe(true);
  });
});

describe("isMilestoneClaimable", () => {
  it("is not claimable below the required score", () => {
    expect(isMilestoneClaimable(milestone({ requiredScore: 10 }), 9, false)).toBe(false);
  });

  it("is claimable once the score meets the requirement and it hasn't been claimed yet", () => {
    expect(isMilestoneClaimable(milestone({ requiredScore: 10 }), 10, false)).toBe(true);
    expect(isMilestoneClaimable(milestone({ requiredScore: 10 }), 25, false)).toBe(true);
  });

  it("is never claimable again once already claimed, regardless of score", () => {
    expect(isMilestoneClaimable(milestone({ requiredScore: 10 }), 25, true)).toBe(false);
  });
});
