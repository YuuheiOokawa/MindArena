import type { ResumeScreen } from "./resume";

/** Maps a resolved resume state to the URL the client should navigate to. Pure — safe for client components. */
export function resumeHref(resume: ResumeScreen): string {
  switch (resume.screen) {
    case "home":
      return "/home";
    case "matchmaking":
      return `/tournaments/${resume.tournamentId}/matchmaking`;
    case "bracket":
      return `/tournaments/${resume.tournamentId}/bracket`;
    case "pre-match":
      return `/tournaments/${resume.tournamentId}/matches/${resume.matchId}/preview`;
    case "game":
      return `/tournaments/${resume.tournamentId}/matches/${resume.matchId}/play`;
    case "champion":
      return `/tournaments/${resume.tournamentId}/champion`;
  }
}
