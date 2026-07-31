import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { LEAGUES } from "../src/config/leagues";
import { GAME_CATALOG } from "../src/config/games";
import { BOT_DIFFICULTY_BANDS, BOT_PERSONALITIES } from "../src/config/bots";
import { ACHIEVEMENTS } from "../src/config/achievements";
import { FRAME_TIERS } from "../src/config/frames";
import { TITLES } from "../src/config/titles";
import { SHOP_ITEMS } from "../src/config/shop-items";
import { ROOM_TYPES } from "../src/config/room-types";
import { FURNITURE_ITEMS } from "../src/config/furniture";
import { EVENTS } from "../src/config/events";
import { APP_CONFIG } from "../src/config/app";
import { calculateReward } from "../src/domain/services/points.service";
import { PointReason } from "../src/domain/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOT_FIRST_SYLLABLES = ["カイ", "レン", "ミナ", "ソウ", "ユキ", "ハル", "アオ", "リオ", "ノア", "ツキ"];
const BOT_LAST_WORDS = ["シャドウ", "ヴェール", "ミラー", "サイレンス", "エコー", "フェイク", "ブラフ", "ゲイズ", "ロジック", "リドル"];

function botName(index: number): string {
  const first = BOT_FIRST_SYLLABLES[index % BOT_FIRST_SYLLABLES.length];
  const last = BOT_LAST_WORDS[Math.floor(index / BOT_FIRST_SYLLABLES.length) % BOT_LAST_WORDS.length];
  return `${first}・${last}`;
}

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function seedLeagues() {
  const idByCode = new Map<string, string>();

  for (const league of LEAGUES) {
    const rewardCtx = { rewardMultiplier: league.rewardMultiplier };
    const row = await prisma.league.upsert({
      where: { code: league.code },
      update: {
        name: league.name,
        displayName: league.displayName,
        description: league.description,
        requiredPoints: league.requiredPoints,
        rewardMultiplier: league.rewardMultiplier,
        championReward: calculateReward(PointReason.CHAMPION, rewardCtx),
        runnerUpReward: calculateReward(PointReason.RUNNER_UP, rewardCtx),
        topFourReward: calculateReward(PointReason.SEMIFINAL_CLEAR, rewardCtx),
        participationReward: calculateReward(PointReason.TOURNAMENT_ENTRY, rewardCtx),
        botDifficulty: league.botDifficulty,
        themeKey: league.themeKey,
        frameKey: league.frameKey,
        displayOrder: league.displayOrder,
        isActive: true,
      },
      create: {
        code: league.code,
        name: league.name,
        displayName: league.displayName,
        description: league.description,
        requiredPoints: league.requiredPoints,
        rewardMultiplier: league.rewardMultiplier,
        championReward: calculateReward(PointReason.CHAMPION, rewardCtx),
        runnerUpReward: calculateReward(PointReason.RUNNER_UP, rewardCtx),
        topFourReward: calculateReward(PointReason.SEMIFINAL_CLEAR, rewardCtx),
        participationReward: calculateReward(PointReason.TOURNAMENT_ENTRY, rewardCtx),
        botDifficulty: league.botDifficulty,
        themeKey: league.themeKey,
        frameKey: league.frameKey,
        displayOrder: league.displayOrder,
      },
    });
    idByCode.set(league.code, row.id);
  }

  console.log(`Seeded ${LEAGUES.length} leagues.`);
  return idByCode;
}

async function seedGameTypes() {
  for (const game of GAME_CATALOG) {
    await prisma.gameType.upsert({
      where: { code: game.code },
      update: {
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        configuration: { totalRounds: game.totalRounds, tagline: game.tagline, rules: game.rules },
        isActive: true,
      },
      create: {
        code: game.code,
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        configuration: { totalRounds: game.totalRounds, tagline: game.tagline, rules: game.rules },
      },
    });
  }
  console.log(`Seeded ${GAME_CATALOG.length} game types.`);
}

async function seedBots() {
  await prisma.botProfile.deleteMany({ where: { participations: { none: {} } } });

  let index = 0;
  const rows: { name: string; personality: string; difficulty: string; judgment: number; deception: number; observation: number; riskTolerance: number; memory: number; randomness: number; avatarKey: string }[] = [];

  for (const band of BOT_DIFFICULTY_BANDS) {
    for (const personality of BOT_PERSONALITIES) {
      for (let copy = 0; copy < 2; copy++) {
        rows.push({
          name: botName(index),
          personality: personality.id,
          difficulty: band.difficulty,
          judgment: randomInRange(band.stats.min, band.stats.max),
          deception: randomInRange(band.stats.min, band.stats.max),
          observation: randomInRange(band.stats.min, band.stats.max),
          riskTolerance: randomInRange(band.stats.min, band.stats.max),
          memory: randomInRange(band.stats.min, band.stats.max),
          randomness: Math.max(3, 100 - randomInRange(band.stats.min, band.stats.max)),
          avatarKey: `bot-${index % 12}`,
        });
        index++;
      }
    }
  }

  for (const bot of rows) {
    const existing = await prisma.botProfile.findFirst({ where: { name: bot.name, difficulty: bot.difficulty as never } });
    if (existing) continue;
    await prisma.botProfile.create({ data: bot as never });
  }

  console.log(`Seeded ${rows.length} bot profiles (${BOT_DIFFICULTY_BANDS.length} difficulties x ${BOT_PERSONALITIES.length} personalities x 2).`);
}

async function seedAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        conditionType: achievement.conditionType,
        conditionValue: achievement.conditionValue,
        rewardData: { points: achievement.rewardPoints },
        isActive: true,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        conditionType: achievement.conditionType,
        conditionValue: achievement.conditionValue,
        rewardData: { points: achievement.rewardPoints },
      },
    });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

async function seedCosmetics() {
  for (const frame of FRAME_TIERS) {
    await prisma.cosmeticItem.upsert({
      where: { code: frame.code },
      update: { name: frame.name, requiredPoints: frame.minPoints, assetKey: frame.id, effectConfig: { glowIntensity: frame.glowIntensity }, category: "FRAME", isActive: true },
      create: { code: frame.code, name: frame.name, category: "FRAME", requiredPoints: frame.minPoints, assetKey: frame.id, effectConfig: { glowIntensity: frame.glowIntensity } },
    });
  }

  for (const title of TITLES) {
    await prisma.cosmeticItem.upsert({
      where: { code: title.code },
      update: { name: title.name, requiredPoints: 0, price: title.price ?? null, assetKey: title.id, effectConfig: { unlockHint: title.unlockHint }, category: "TITLE", isActive: true },
      create: { code: title.code, name: title.name, category: "TITLE", requiredPoints: 0, price: title.price ?? null, assetKey: title.id, effectConfig: { unlockHint: title.unlockHint } },
    });
  }

  for (const item of SHOP_ITEMS) {
    await prisma.cosmeticItem.upsert({
      where: { code: item.code },
      update: { name: item.name, category: item.category, requiredPoints: 0, price: item.price, assetKey: item.assetKey, isActive: true },
      create: { code: item.code, name: item.name, category: item.category, requiredPoints: 0, price: item.price, assetKey: item.assetKey },
    });
  }

  console.log(`Seeded ${FRAME_TIERS.length} frames, ${TITLES.length} titles, and ${SHOP_ITEMS.length} shop items.`);
}

async function seedRoomsAndFurniture(leagueIds: Map<string, string>) {
  for (const roomType of ROOM_TYPES) {
    const requiredLeagueId = leagueIds.get(roomType.requiredLeagueCode)!;
    await prisma.roomType.upsert({
      where: { code: roomType.code },
      update: {
        name: roomType.name,
        capacity: roomType.capacity,
        purchasePrice: roomType.purchasePrice,
        upgradePrice: roomType.upgradePrice,
        requiredLeagueId,
        width: roomType.width,
        height: roomType.height,
        sortOrder: roomType.sortOrder,
        isActive: true,
      },
      create: {
        code: roomType.code,
        name: roomType.name,
        capacity: roomType.capacity,
        purchasePrice: roomType.purchasePrice,
        upgradePrice: roomType.upgradePrice,
        requiredLeagueId,
        width: roomType.width,
        height: roomType.height,
        sortOrder: roomType.sortOrder,
      },
    });
  }

  for (const item of FURNITURE_ITEMS) {
    const requiredLeagueId = item.requiredLeagueCode ? leagueIds.get(item.requiredLeagueCode)! : null;
    await prisma.shopFurnitureItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        price: item.price,
        requiredLeagueId,
        width: item.width,
        height: item.height,
        colorKey: item.colorKey,
        stackable: item.stackable ?? false,
        isActive: true,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        price: item.price,
        requiredLeagueId,
        width: item.width,
        height: item.height,
        colorKey: item.colorKey,
        stackable: item.stackable ?? false,
      },
    });
  }

  console.log(`Seeded ${ROOM_TYPES.length} room types and ${FURNITURE_ITEMS.length} furniture items.`);
}

async function seedEvents() {
  for (const event of EVENTS) {
    const row = await prisma.event.upsert({
      where: { code: event.code },
      update: {
        name: event.name,
        description: event.description,
        themeKey: event.themeKey,
        startAt: event.startAt,
        endAt: event.endAt,
        isActive: true,
      },
      create: {
        code: event.code,
        name: event.name,
        description: event.description,
        themeKey: event.themeKey,
        startAt: event.startAt,
        endAt: event.endAt,
      },
    });

    for (const milestone of event.milestones) {
      await prisma.eventMilestone.upsert({
        where: { eventId_code: { eventId: row.id, code: milestone.code } },
        update: {
          name: milestone.name,
          requiredScore: milestone.requiredScore,
          rewardPoints: milestone.rewardPoints,
          rewardPrizeCurrency: milestone.rewardPrizeCurrency,
          sortOrder: milestone.sortOrder,
        },
        create: {
          eventId: row.id,
          code: milestone.code,
          name: milestone.name,
          requiredScore: milestone.requiredScore,
          rewardPoints: milestone.rewardPoints,
          rewardPrizeCurrency: milestone.rewardPrizeCurrency,
          sortOrder: milestone.sortOrder,
        },
      });
    }
  }

  console.log(`Seeded ${EVENTS.length} events.`);
}

async function seedDemoUser(entryLeagueId: string) {
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping demo user (NODE_ENV=production).");
    return;
  }

  const { username, email, password } = APP_CONFIG.demoAccount;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { email, passwordHash },
    create: { username, email, passwordHash },
  });

  await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: username, currentLeagueId: entryLeagueId, totalPoints: 120 },
  });

  console.log(`Seeded demo user: ${username} / ${password}`);
}

async function main() {
  const leagueIds = await seedLeagues();
  await seedGameTypes();
  await seedBots();
  await seedAchievements();
  await seedCosmetics();
  await seedRoomsAndFurniture(leagueIds);
  await seedEvents();

  const entryLeagueCode = LEAGUES.find((l) => l.requiredPoints === 0)!.code;
  await seedDemoUser(leagueIds.get(entryLeagueCode)!);

  console.log("Seed complete.");
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
