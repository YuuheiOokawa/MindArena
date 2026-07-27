import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/database/prisma";
import { registerUser } from "@/features/auth/register.service";
import { changePassword } from "@/features/auth/change-password.service";
import { verifyPassword } from "@/infrastructure/auth/password";
import { AppError } from "@/lib/errors/app-error";

const RUN_ID = Date.now();
function username(name: string) {
  return `pwd_${name}_${RUN_ID}`;
}

const createdUserIds: string[] = [];

async function makeUser(name: string) {
  const uname = username(name);
  const user = await registerUser({ username: uname, email: `${uname}@example.com`, password: "OldPass123", confirmPassword: "OldPass123", agreedToTerms: true });
  createdUserIds.push(user.id);
  return { userId: user.id };
}

beforeAll(async () => {
  const leagueCount = await prisma.league.count();
  if (leagueCount === 0) throw new Error("No leagues seeded — run `npm run db:seed` before the integration suite.");
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    await prisma.playerProfile.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("change password", () => {
  it("rejects the wrong current password without changing anything", async () => {
    const alice = await makeUser("alice");
    await expect(changePassword(alice.userId, "WrongPassword1", "NewPass456")).rejects.toThrow(AppError);

    const stillOld = await prisma.user.findUniqueOrThrow({ where: { id: alice.userId } });
    expect(await verifyPassword("OldPass123", stillOld.passwordHash)).toBe(true);
  });

  it("updates the password hash when the current password is correct", async () => {
    const bob = await makeUser("bob");
    await changePassword(bob.userId, "OldPass123", "NewPass456");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: bob.userId } });
    expect(await verifyPassword("NewPass456", updated.passwordHash)).toBe(true);
    expect(await verifyPassword("OldPass123", updated.passwordHash)).toBe(false);
  });
});
