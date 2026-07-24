import { describe, expect, it } from "vitest";
import { maybeFlip, pickWeighted, rollMistakeProbability } from "@/features/bots/mistake";
import { createSeededRandom } from "@/lib/utils/seeded-random";
import { BotPersonality } from "@/domain/enums";
import type { BotPlayer } from "@/domain/interfaces/psychological-game";

function makeBot(randomness: number): BotPlayer {
  return {
    participantId: "bot-1",
    botProfileId: "profile-1",
    personality: BotPersonality.RANDOM,
    judgment: 50,
    deception: 50,
    observation: 50,
    riskTolerance: 50,
    memory: 50,
    randomness,
  };
}

describe("rollMistakeProbability", () => {
  it("scales monotonically with the bot's randomness stat", () => {
    expect(rollMistakeProbability(makeBot(10))).toBeLessThan(rollMistakeProbability(makeBot(50)));
    expect(rollMistakeProbability(makeBot(50))).toBeLessThan(rollMistakeProbability(makeBot(100)));
  });

  it("never exceeds 0.5 (a bot is never worse than a coin flip)", () => {
    expect(rollMistakeProbability(makeBot(100))).toBeLessThanOrEqual(0.5);
  });
});

describe("maybeFlip", () => {
  it("a MASTER-band (low randomness) bot picks the optimal move far more often than an EASY-band bot", () => {
    const random = createSeededRandom(12345);
    const trials = 2000;

    let masterOptimalCount = 0;
    let easyOptimalCount = 0;
    const master = makeBot(5);
    const easy = makeBot(90);

    for (let i = 0; i < trials; i++) {
      if (maybeFlip("OPTIMAL", "SUBOPTIMAL", master, random) === "OPTIMAL") masterOptimalCount++;
      if (maybeFlip("OPTIMAL", "SUBOPTIMAL", easy, random) === "OPTIMAL") easyOptimalCount++;
    }

    expect(masterOptimalCount).toBeGreaterThan(easyOptimalCount);
    expect(masterOptimalCount / trials).toBeGreaterThan(0.9);
  });
});

describe("pickWeighted", () => {
  it("always returns one of the provided option values", () => {
    const random = createSeededRandom(1);
    const options = [
      { value: "a", weight: 1 },
      { value: "b", weight: 5 },
      { value: "c", weight: 0 },
    ];
    for (let i = 0; i < 100; i++) {
      expect(["a", "b", "c"]).toContain(pickWeighted(options, random));
    }
  });
});
