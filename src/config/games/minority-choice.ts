/** Odd crowd size so crowd + the 2 contestants (23 total votes) can never split evenly —
 * every round has a true minority side, eliminating the dead "nobody scores" tie outcome. */
export const MINORITY_CHOICE_CROWD_SIZE = 21;

/** How many of the crowd's votes are published to BOTH players before they declare/choose (the
 * 事前公開票). The remaining hidden votes keep the round from collapsing into a solved
 * pick-the-smaller-side exercise, but are few enough that counting the revealed votes gives a
 * genuine, calculable read — skill (vote counting + opponent prediction) instead of a blind
 * coin flip on an invisible crowd. */
export const MINORITY_CHOICE_CROWD_REVEALED = 17;

/** Crowd lean noise band: the simulated crowd's A/B split drifts within this range each round. */
export const MINORITY_CHOICE_CROWD_LEAN_MIN = 0.3;
export const MINORITY_CHOICE_CROWD_LEAN_MAX = 0.7;
