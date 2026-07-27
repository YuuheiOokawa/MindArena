import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { deactivateAccount } from "@/features/auth/deactivate-account.service";
import { submitInquiry } from "@/features/support/submit-inquiry.service";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `deact_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string, password = "TestPass123") {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password, confirmPassword: password, agreedToTerms: true });
  createdUserIds.push(user.id);
  return { userId: user.id, username: uname };
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  await prisma.inquiry.deleteMany({ where: { OR: [...createdUserIds.map((userId) => ({ userId })), { userId: null, email: { contains: `${RUN_ID}` } }] } });
  for (const userId of createdUserIds) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) await prisma.pointTransaction.deleteMany({ where: { playerProfileId: profile.id } });
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("account deactivation (退会)", () => {
  it("rejects deactivation with the wrong password", async () => {
    const alice = await makeUser("alice");
    await expect(deactivateAccount(alice.userId, "WrongPassword1")).rejects.toThrow(AppError);

    const stillActive = await prisma.user.findUniqueOrThrow({ where: { id: alice.userId } });
    expect(stillActive.deletedAt).toBeNull();
  });

  it("scrubs username/email/password and sets deletedAt on success, freeing the original identifiers for re-registration", async () => {
    const bob = await makeUser("bob");
    const profileBefore = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: bob.userId } });

    await deactivateAccount(bob.userId, "TestPass123");

    const deactivated = await prisma.user.findUniqueOrThrow({ where: { id: bob.userId } });
    expect(deactivated.deletedAt).not.toBeNull();
    expect(deactivated.username).not.toBe(bob.username);
    expect(deactivated.passwordHash).toBe("");

    const profileAfter = await prisma.playerProfile.findUniqueOrThrow({ where: { id: profileBefore.id } });
    expect(profileAfter.displayName).toBe("退会したユーザー");

    // The original username is now free — re-registering with it succeeds instead of colliding.
    const reregistered = await registerUser({
      username: bob.username,
      email: `re_${bob.username}@example.com`,
      password: "TestPass123",
      confirmPassword: "TestPass123",
      agreedToTerms: true,
    });
    createdUserIds.push(reregistered.id);
    expect(reregistered.username).toBe(bob.username);
  });

  it("rejects deactivating an already-deactivated account (password no longer matches)", async () => {
    const carol = await makeUser("carol");
    await deactivateAccount(carol.userId, "TestPass123");
    await expect(deactivateAccount(carol.userId, "TestPass123")).rejects.toThrow(AppError);
  });
});

describe("support inquiries", () => {
  it("persists an inquiry submitted by a logged-in user", async () => {
    const dave = await makeUser("dave");
    await submitInquiry(dave.userId, { category: "bug", email: "dave@example.com", message: "テスト用のお問い合わせ本文です。" });

    const rows = await prisma.inquiry.findMany({ where: { userId: dave.userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe("bug");
    expect(rows[0].message).toBe("テスト用のお問い合わせ本文です。");
  });

  it("persists an inquiry with no logged-in user (userId null)", async () => {
    const email = `anon_${RUN_ID}@example.com`;
    await submitInquiry(null, { category: "other", email, message: "ログインしていない状態からのお問い合わせです。" });

    const rows = await prisma.inquiry.findMany({ where: { userId: null, email } });
    expect(rows).toHaveLength(1);
  });
});
