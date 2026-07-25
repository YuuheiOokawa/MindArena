import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { sendFriendRequest, acceptFriendRequest } from "@/features/friends/friend-request.service";
import { listIncomingFriendRequests } from "@/features/friends/friend.service";
import { sendChallenge, acceptChallenge, listIncomingChallenges } from "@/features/friends/challenge.service";
import { finalizeMatchResult } from "@/features/tournaments/progress.service";
import { updateMyCosmetics } from "@/features/profiles/update-profile.service";
import { getMyProfile } from "@/features/profiles/profile.service";
import { purchaseShopItem } from "@/features/shop/shop.service";
import { AppError } from "@/lib/errors/app-error";

/**
 * Integration tests for the 生涯獲得賞金 (lifetime prize money) stat and for shop-purchased
 * titles becoming selectable — both against a real Postgres database.
 */

const RUN_ID = Date.now();
function username(name: string) {
  return `prize_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];
const createdTournamentIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "TestPass123", confirmPassword: "TestPass123", agreedToTerms: true });
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  createdUserIds.push(user.id);
  return { userId: user.id, profileId: profile.id };
}

async function befriend(userIdA: string, usernameB: string, userIdB: string) {
  await sendFriendRequest(userIdA, usernameB);
  const incoming = await listIncomingFriendRequests(userIdB);
  await acceptFriendRequest(userIdB, incoming[0].friendshipId);
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) {
    throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
  }
});

afterAll(async () => {
  for (const tournamentId of createdTournamentIds) {
    await prisma.matchResult.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.gameSession.deleteMany({ where: { tournamentMatch: { tournamentId } } });
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: profile.id }, { addresseeId: profile.id }] } });
      await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.cosmeticPurchase.deleteMany({ where: { playerProfileId: profile.id } });
    }
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("champion prize awards both a spendable balance and a lifetime total", () => {
  it("increments prizeCurrency and lifetimePrizeCurrency by the same amount for a HUMAN champion", async () => {
    const kai = await makeUser("kai");
    const rin = await makeUser("rin");
    await befriend(kai.userId, username("rin"), rin.userId);

    await sendChallenge(kai.userId, rin.profileId);
    const incoming = await listIncomingChallenges(rin.userId);
    const { tournamentId } = await acceptChallenge(rin.userId, incoming[0].challengeId);
    createdTournamentIds.push(tournamentId);

    const match = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId } });
    const [p1, p2] = await Promise.all([
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player1ParticipantId! } }),
      prisma.tournamentParticipant.findUniqueOrThrow({ where: { id: match.player2ParticipantId! } }),
    ]);
    const kaiParticipant = [p1, p2].find((p) => p.playerId === kai.profileId)!;
    const rinParticipant = [p1, p2].find((p) => p.playerId === rin.profileId)!;

    const kaiBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { id: kai.profileId } });
    expect(kaiBefore.prizeCurrency).toBe(0);
    expect(kaiBefore.lifetimePrizeCurrency).toBe(0);

    // Round 1 is also the final in a 2-player bracket, so kai winning here makes him champion.
    await finalizeMatchResult(
      match.id,
      { gameId: "trust-or-betray", sessionId: match.id, winnerParticipantId: kaiParticipant.id, loserParticipantId: rinParticipant.id, isDraw: false, finalScores: {}, rounds: [] },
      0,
      0,
    );

    const kaiAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: kai.profileId } });
    expect(kaiAfter.prizeCurrency).toBeGreaterThan(0);
    expect(kaiAfter.lifetimePrizeCurrency).toBe(kaiAfter.prizeCurrency);

    // Spending the balance in the shop must not touch the lifetime total.
    const cheapItem = await prisma.cosmeticItem.findFirstOrThrow({ where: { price: { not: null, lte: kaiAfter.prizeCurrency } }, orderBy: { price: "asc" } });
    await purchaseShopItem(kai.userId, cheapItem.id);

    const kaiAfterPurchase = await prisma.playerProfile.findUniqueOrThrow({ where: { id: kai.profileId } });
    expect(kaiAfterPurchase.prizeCurrency).toBe(kaiAfter.prizeCurrency - cheapItem.price!);
    expect(kaiAfterPurchase.lifetimePrizeCurrency).toBe(kaiAfter.lifetimePrizeCurrency);

    const profile = await getMyProfile(kai.userId);
    expect(profile.lifetimePrizeCurrency).toBe(kaiAfterPurchase.lifetimePrizeCurrency);
  });
});

describe("purchasing a shop title unlocks it for selection", () => {
  it("rejects selecting a purchasable title before buying it, allows it after", async () => {
    const luna = await makeUser("luna");
    const title = await prisma.cosmeticItem.findFirstOrThrow({ where: { category: "TITLE", price: { not: null } } });

    await expect(updateMyCosmetics(luna.userId, { selectedTitleId: title.assetKey })).rejects.toThrow(AppError);

    await prisma.playerProfile.update({ where: { id: luna.profileId }, data: { prizeCurrency: title.price! } });
    await purchaseShopItem(luna.userId, title.id);

    await expect(updateMyCosmetics(luna.userId, { selectedTitleId: title.assetKey })).resolves.toBeDefined();

    const profile = await getMyProfile(luna.userId);
    expect(profile.unlockedTitleIds).toContain(title.assetKey);
    expect(profile.selectedTitleId).toBe(title.assetKey);
  });
});
