import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Dev convenience script: wipes all tournament/match/point history and resets the seeded demo
 * user back to a fresh state. Not part of the app runtime — run manually via `npx tsx
 * prisma/reset-demo.ts` when you want a clean slate for manual QA or the E2E suite.
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run reset-demo.ts against a production environment.");
  }

  await prisma.gameAction.deleteMany({});
  await prisma.matchResult.deleteMany({});
  await prisma.gameSession.deleteMany({});
  await prisma.tournamentMatch.deleteMany({});
  await prisma.tournamentParticipant.deleteMany({});
  await prisma.tournament.deleteMany({});
  await prisma.pointTransaction.deleteMany({});
  await prisma.playerGameStats.deleteMany({});
  await prisma.playerAchievement.deleteMany({});

  const user = await prisma.user.findUnique({ where: { username: "demo" } });
  if (!user) {
    console.log("No demo user found (production seed skips it) — nothing to reset.");
    return;
  }

  const entryLeague = await prisma.league.findFirstOrThrow({ orderBy: { displayOrder: "asc" } });
  await prisma.playerProfile.update({
    where: { userId: user.id },
    data: {
      totalPoints: 0,
      currentLeagueId: entryLeague.id,
      totalMatches: 0,
      totalWins: 0,
      totalLosses: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      tournamentEntries: 0,
      tournamentWins: 0,
      finalsReached: 0,
      selectedTitleId: null,
      selectedFrameId: null,
    },
  });

  console.log("Demo user reset to a clean state.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
