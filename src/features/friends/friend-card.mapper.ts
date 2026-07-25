import { TITLES } from "@/config/titles";

interface ProfileCardRow {
  id: string;
  displayName: string;
  totalPoints: number;
  selectedTitleId: string | null;
  selectedFrameId: string | null;
  currentLeague: { code: string; displayName: string };
}

/** Shared shape for a friend/search-result card: only public-safe profile fields.
 * `username` is the account handle (unlike displayName, it's unique and doesn't change), shown
 * alongside the display name wherever a friend/opponent is a known person rather than a bot. */
export function toFriendCard(profile: ProfileCardRow, username: string) {
  const title = TITLES.find((t) => t.id === profile.selectedTitleId) ?? null;
  return {
    profileId: profile.id,
    displayName: profile.displayName,
    username,
    totalPoints: profile.totalPoints,
    league: profile.currentLeague,
    selectedFrameId: profile.selectedFrameId,
    titleName: title?.name ?? null,
  };
}
