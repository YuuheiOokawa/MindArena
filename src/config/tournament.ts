/**
 * How long a tournament stays RECRUITING (waiting for invited friends to join) before the
 * remaining seats get BOT-filled and the bracket starts. Checked lazily whenever the tournament
 * is polled (see features/tournaments/invite.service.ts's finalizeIfDue) — there's no background
 * job, so a tournament with no active viewer just finalizes on the next poll after this elapses.
 */
export const RECRUITING_WINDOW_SECONDS = 45;
