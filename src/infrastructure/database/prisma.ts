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

  const pool = globalThis.__mindArenaPool ?? new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__mindArenaPool = pool;
    globalThis.__mindArenaPrisma = client;
  }

  return client;
}

export const prisma = globalThis.__mindArenaPrisma ?? createClient();
