import { TITLES } from "@/config/titles";

interface ProfileCardRow {
  id: string;
  displayName: string;
  totalPoints: number;
  selectedTitleId: string | null;
  selectedFrameId: string | null;
  currentLeague: { code: string; displayName: string };
}

/** Shared shape for a friend/search-result card: only public-safe profile fields. */
export function toFriendCard(profile: ProfileCardRow) {
  const title = TITLES.find((t) => t.id === profile.selectedTitleId) ?? null;
  return {
    profileId: profile.id,
    displayName: profile.displayName,
    totalPoints: profile.totalPoints,
    league: profile.currentLeague,
    selectedFrameId: profile.selectedFrameId,
    titleName: title?.name ?? null,
  };
}
