import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 requires a driver adapter for PostgreSQL rather than a bare connection string on
 * PrismaClient. This is the ONLY file that constructs a Pool/PrismaClient — every other module
 * that needs the database imports `prisma` from here (repositories are the only other layer
 * allowed to import this file — see docs/04_ARCHITECTURE.md).
 */
declare global {
  var __mindArenaPrisma: PrismaClient | undefined;
  var __mindArenaPool: Pool | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
  }

  const pool =
    globalThis.__mindArenaPool ??
    new Pool({
      connectionString,
      // Explicit, tuned pool sizing for concurrent-user load (pg's own default is a bare `max: 10`
      // with no timeouts, which under real traffic either over-provisions per instance or hangs
      // indefinitely waiting for a client instead of failing fast). The default here is small
      // because this app's intended deploy target is Vercel (serverless): every function
      // invocation can spin up its own process with its own fresh Pool, so a small per-process max
      // is what keeps N-concurrent-invocations × max from blowing past Neon's connection limit —
      // ALWAYS pair this with Neon's pooled ("-pooler") connection string in production (see
      // .env.example), which fans this out through PgBouncer instead of Neon's direct-connection
      // cap. Override via DATABASE_POOL_MAX for a non-serverless (long-running server) deploy,
      // where a single larger pool shared across all requests is the better fit.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__mindArenaPool = pool;
    globalThis.__mindArenaPrisma = client;
  }

  return client;
}

export const prisma = globalThis.__mindArenaPrisma ?? createClient();
