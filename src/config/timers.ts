import { TimeoutPolicy } from "@/domain/enums";

/** Default per-phase timer budget (seconds), source spec §21. Games may override via their own config. */
export const DEFAULT_GAME_TIMERS = {
  ruleExplainSeconds: 10,
  choiceSeconds: 15,
  resultSeconds: 4,
} as const;

/** Below this many seconds remaining, the UI should switch the timer into its "urgent" visual state. */
export const TIMER_URGENT_THRESHOLD_SECONDS = 5;

export const DEFAULT_TIMEOUT_POLICY: TimeoutPolicy = TimeoutPolicy.RANDOM_ACTION;
