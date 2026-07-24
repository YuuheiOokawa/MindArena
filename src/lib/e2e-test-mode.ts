/**
 * Dev/E2E-only flag (source spec §27) that lets the Playwright happy-path suite deterministically
 * win every match instead of depending on genuine (unpredictable) bot/crowd randomness. Refuses
 * to activate outside development/test regardless of the env value, so it can never be used to
 * cheat a live game (docs/12_SECURITY.md, docs/13_TEST_PLAN.md).
 */
export function isE2eTestMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true";
}
