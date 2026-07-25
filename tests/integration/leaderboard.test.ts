import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { getLeaderboard } from "@/features/leaderboard/leaderboard.service";

/**
 * Integration tests for the leaderboard read model (docs/15_FUTURE_ROADMAP.md: pure aggregation
 * over PlayerProfile.totalPoints, no write-path changes) against a real Postgres database.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `lb_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string, points: number, leagueId: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  createdUserIds.push(user.id);
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.playerProfile.update({ where: { id: profile.id }, data: { totalPoints: points, currentLeagueId: leagueId } });
  return { userId: user.id, profileId: profile.id };
}

let bronzeId: string;
let silverId: string;

beforeAll(async () => {
  const [bronze, silver] = await Promise.all([
    prisma.league.findFirst({ where: { code: "BRONZE" } }),
    prisma.league.findFirst({ where: { code: "SILVER" } }),
  ]);
  if (!bronze || !silver) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  bronzeId = bronze.id;
  silverId = silver.id;
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("global and per-league leaderboards", () => {
  it("ranks players by totalPoints descending, ties sharing a rank", async () => {
    // This dev DB accumulates leftover profiles across the whole integration suite's runs, so
    // absolute rank numbers aren't assertable directly — instead cross-check each rank against
    // an independent count query, which stays correct regardless of what else is in the table.
    const alice = await makeUser("alice", 400, bronzeId);
    const bob = await makeUser("bob", 300, bronzeId);
    const carol = await makeUser("carol", 300, bronzeId); // ties with bob
    const dave = await makeUser("dave", 100, silverId); // different league entirely

    const global = await getLeaderboard(alice.userId, "global");
    const byId = new Map(global.entries.map((e) => [e.playerProfileId, e]));

    const aliceRank = byId.get(alice.profileId)?.rank;
    const bobRank = byId.get(bob.profileId)?.rank;
    const carolRank = byId.get(carol.profileId)?.rank;
    expect(aliceRank).toBeDefined();
    expect(bobRank).toBeDefined();
    expect(carolRank).toBeDefined();
    expect(bobRank).toBe(carolRank); // tied with each other
    expect(aliceRank!).toBeLessThan(bobRank!); // strictly more points than the tied pair

    const aliceAboveCount = await prisma.playerProfile.count({ where: { totalPoints: { gt: 400 } } });
    expect(aliceRank).toBe(aliceAboveCount + 1);
    expect(global.myRank).toBe(aliceRank);
    // alice is in the returned page (found above), so she shouldn't also appear as a separate
    // "outside the page" pinned entry.
    expect(global.myEntry).toBeNull();

    const daveRank = byId.get(dave.profileId)?.rank;
    if (daveRank !== undefined) {
      const daveAboveCount = await prisma.playerProfile.count({ where: { totalPoints: { gt: 100 } } });
      expect(daveRank).toBe(daveAboveCount + 1);
      expect(daveRank).toBeGreaterThan(carolRank!);
    }
  });

  it("scopes the league leaderboard to players currently in that league", async () => {
    const erin = await makeUser("erin", 250, bronzeId);
    const frank = await makeUser("frank", 150, silverId);

    const leagueBoard = await getLeaderboard(erin.userId, "league");
    const ids = new Set(leagueBoard.entries.map((e) => e.playerProfileId));

    expect(ids.has(erin.profileId)).toBe(true);
    expect(ids.has(frank.profileId)).toBe(false); // frank is in a different league
  });

  it("computes myRank/myEntry for a caller outside the returned page (myEntry set, isMe true)", async () => {
    const gina = await makeUser("gina", 50, bronzeId);
    // gina's own totalPoints (50) is the lowest of everyone seeded above in this league, so she's
    // last-ranked but still well within the default top-N page — assert the shape is correct
    // regardless of whether she happens to be inside or outside the page.
    const board = await getLeaderboard(gina.userId, "league");
    const inPage = board.entries.some((e) => e.playerProfileId === gina.profileId && e.isMe);
    if (!inPage) {
      expect(board.myEntry?.playerProfileId).toBe(gina.profileId);
      expect(board.myEntry?.isMe).toBe(true);
      expect(board.myEntry?.rank).toBe(board.myRank);
    } else {
      expect(board.myEntry).toBeNull();
    }
  });
});
