import { describe, expect, it } from "vitest";
import { toFriendCard } from "@/features/friends/friend-card.mapper";

const BASE_PROFILE = {
  id: "profile-1",
  displayName: "Mind Player",
  totalPoints: 1200,
  selectedTitleId: null as string | null,
  selectedFrameId: null as string | null,
  currentLeague: { code: "SILVER", displayName: "シルバーリーグ" },
};

describe("toFriendCard", () => {
  it("resolves a known selectedTitleId to its display name", () => {
    const card = toFriendCard({ ...BASE_PROFILE, selectedTitleId: "champion" });
    expect(card.titleName).toBe("頂点の証");
  });

  it("falls back to null when no title is selected or the id is unknown", () => {
    expect(toFriendCard({ ...BASE_PROFILE, selectedTitleId: null }).titleName).toBeNull();
    expect(toFriendCard({ ...BASE_PROFILE, selectedTitleId: "not-a-real-title" }).titleName).toBeNull();
  });

  it("passes through the core profile fields untouched", () => {
    const card = toFriendCard(BASE_PROFILE);
    expect(card).toMatchObject({
      profileId: "profile-1",
      displayName: "Mind Player",
      totalPoints: 1200,
      league: { code: "SILVER", displayName: "シルバーリーグ" },
    });
  });
});
