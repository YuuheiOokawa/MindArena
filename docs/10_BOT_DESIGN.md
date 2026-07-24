# 10. Bot Design

## Personalities (`BotPersonality`)

| Personality | Tendency |
|---|---|
| RANDOM | near-uniform random choice, minimal adaptation |
| CAUTIOUS | favors safe/defensive options, low risk tolerance |
| AGGRESSIVE | favors high-upside/betray-leaning options |
| BETRAYER | biased toward betrayal/bluff-style options specifically |
| PATTERN | follows a fixed or slowly-shifting sequence, exploitable if observed |
| ANALYST | weights choices using the observed opponent's action history |

## Stats (`BotProfile`, 0–100 each)

`judgment` (decision quality), `deception` (bluff/declaration credibility), `observation`
(how much opponent history influences its next move), `riskTolerance`, `memory` (how many past
rounds/opponents it factors in), `randomness` (noise injected even when the "correct" play is
clear).

## Difficulty → stat bands (`config/bots.ts`)

| Difficulty | Stat range | Mistake rate |
|---|---|---|
| EASY | 10–35 | high |
| NORMAL | 30–55 | moderate |
| HARD | 50–70 | low |
| EXPERT | 65–85 | very low |
| MASTER | 80–99 | near-optimal, still not deterministic |

Each `League` config maps to a `botDifficulty` (`config/leagues.ts`), so higher leagues field
tougher bots — `features/matchmaking/bot-fill.service.ts` samples `BotProfile` rows filtered by
that difficulty band (falling back to nearest band if a league has too few seeded bots).

## Per-game strategy resolution

`features/bots/strategy-registry.ts` maps `gameId → personality → strategy function`. Every
`PsychologicalGame.createBotAction(state, bot)` implementation delegates to this registry
rather than hardcoding bot behavior inside the game module — this keeps "how a personality
plays Trust or Betray" separate from "the rules of Trust or Betray" and lets new personalities
or new games be added independently (`08_GAME_ENGINE_DESIGN.md`).

Each strategy function takes `(state, bot: BotProfile)` and returns a valid action by:
1. Computing a "correct/optimal" action for the current state.
2. Rolling `randomness` vs. a personality-weighted noise curve to decide whether to deviate.
3. If deviating, picking a suboptimal action instead — so even MASTER bots are beatable, just
   rarely.

This mistake-injection is unit tested (`tests/unit/bots/*.test.ts`) by asserting the
optimal-action rate rises monotonically with difficulty band across many simulated draws.
