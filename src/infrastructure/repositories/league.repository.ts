import { prisma } from "@/infrastructure/database/prisma";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";
import type { LeagueEntity } from "@/domain/entities";
import { GAME_CATALOG } from "@/config/games";

function toEntity(row: {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  requiredPoints: number;
  rewardMultiplier: number;
  championReward: number;
  runnerUpReward: number;
  topFourReward: number;
  participationReward: number;
  botDifficulty: string;
  themeKey: string;
  frameKey: string;
  displayOrder: number;
  isActive: boolean;
}): LeagueEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    requiredPoints: row.requiredPoints,
    rewardMultiplier: row.rewardMultiplier,
    championReward: row.championReward,
    runnerUpReward: row.runnerUpReward,
    topFourReward: row.topFourReward,
    participationReward: row.participationReward,
    botDifficulty: row.botDifficulty as LeagueEntity["botDifficulty"],
    themeKey: row.themeKey,
    frameKey: row.frameKey,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    gameIds: GAME_CATALOG.map((game) => game.id),
  };
}

/** Master data (leagues rarely change post-seed) — memoized to cut DB round-trips on this
 * near-every-page-load read. See infrastructure/database/ttl-cache.ts. */
const findAllActiveCached = memoizeWithTtl(async (): Promise<LeagueEntity[]> => {
  const rows = await prisma.league.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
  return rows.map(toEntity);
}, 60_000);

export const leagueRepository = {
  findAllActive: findAllActiveCached,

  async findById(id: string) {
    return prisma.league.findUnique({ where: { id } });
  },

  async findByCode(code: string) {
    return prisma.league.findUnique({ where: { code } });
  },

  async findEntryLeague(): Promise<LeagueEntity> {
    const row = await prisma.league.findFirst({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
    if (!row) throw new Error("No leagues are seeded. Run `npm run db:seed`.");
    return toEntity(row);
  },
};
