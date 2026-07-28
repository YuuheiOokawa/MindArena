import { redirect } from "next/navigation";

/**
 * League browsing + the tournament join action now live together on /leagues and
 * /leagues/[leagueId] (source: リーグ/トーナメントタブ統合) — this route is kept only so old
 * links/bookmarks to /tournaments/join(?league=X) still land somewhere sensible.
 */
export default async function TournamentJoinRedirectPage({ searchParams }: { searchParams: Promise<{ league?: string }> }) {
  const { league } = await searchParams;
  redirect(league ? `/leagues/${league}` : "/leagues");
}
