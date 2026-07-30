import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { getLeagueDetail, listLeaguesWithUnlockStatus } from "@/features/leagues/league.service";
import { HIDDEN_LEAGUE_REVEAL_POINTS } from "@/config/leagues";
import { AppError } from "@/lib/errors/app-error";

/**
 * 裏リーグ (VOID) concealment: the league must be completely invisible — list and detail alike —
 * until the player reaches the top of the public ladder (MIND KING, 75,000pt), then behave like
 * any other league.
 */

let voidLeagueId: string;

beforeAll(async () => {
  const voidLeague = await prisma.league.findUnique({ where: { code: "VOID" } });
  if (!voidLeague) throw new Error("VOID league not seeded — run `npm run db:seed` before the integration suite.");
  voidLeagueId = voidLeague.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("hidden league (VOID) visibility", () => {
  it("is absent from the league list below the reveal threshold", async () => {
    const leagues = await listLeaguesWithUnlockStatus(0);
    expect(leagues.some((l) => l.code === "VOID")).toBe(false);

    const nearlyThere = await listLeaguesWithUnlockStatus(HIDDEN_LEAGUE_REVEAL_POINTS - 1);
    expect(nearlyThere.some((l) => l.code === "VOID")).toBe(false);
  });

  it("appears in the league list once the player reaches MIND KING", async () => {
    const leagues = await listLeaguesWithUnlockStatus(HIDDEN_LEAGUE_REVEAL_POINTS);
    const voidEntry = leagues.find((l) => l.code === "VOID");
    expect(voidEntry).toBeDefined();
    expect(voidEntry!.unlocked).toBe(false); // revealed at 75k, but joining still needs 120k

    const atVoid = await listLeaguesWithUnlockStatus(120000);
    expect(atVoid.find((l) => l.code === "VOID")!.unlocked).toBe(true);
  });

  it("its detail page 404s below the reveal threshold, indistinguishable from a missing league", async () => {
    await expect(getLeagueDetail(voidLeagueId, 0)).rejects.toThrowError(AppError);
    await expect(getLeagueDetail(voidLeagueId, 0)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const revealed = await getLeagueDetail(voidLeagueId, HIDDEN_LEAGUE_REVEAL_POINTS);
    expect(revealed.code).toBe("VOID");
  });

  it("public leagues are unaffected by the visibility filter", async () => {
    const leagues = await listLeaguesWithUnlockStatus(0);
    expect(leagues).toHaveLength(10); // the 10 public leagues
    expect(leagues.some((l) => l.code === "BRONZE")).toBe(true);
    expect(leagues.some((l) => l.code === "MIND_KING")).toBe(true);
  });
});
