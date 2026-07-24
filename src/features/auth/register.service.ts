import { prisma } from "@/infrastructure/database/prisma";
import { userRepository } from "@/infrastructure/repositories/user.repository";
import { leagueRepository } from "@/infrastructure/repositories/league.repository";
import { hashPassword } from "@/infrastructure/auth/password";
import { AppError } from "@/lib/errors/app-error";
import type { RegisterInput } from "@/lib/validation/auth.schema";

export async function registerUser(input: RegisterInput) {
  const [existingUsername, existingEmail] = await Promise.all([
    userRepository.findByUsername(input.username),
    userRepository.findByEmail(input.email),
  ]);

  if (existingUsername) {
    throw new AppError("VALIDATION_ERROR", "このユーザー名はすでに使用されています。");
  }
  if (existingEmail) {
    throw new AppError("VALIDATION_ERROR", "このメールアドレスはすでに使用されています。");
  }

  const passwordHash = await hashPassword(input.password);
  const entryLeague = await leagueRepository.findEntryLeague();

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { username: input.username, email: input.email, passwordHash },
    });
    await tx.playerProfile.create({
      data: {
        userId: createdUser.id,
        displayName: input.username,
        currentLeagueId: entryLeague.id,
      },
    });
    return createdUser;
  });

  return { id: user.id, username: user.username, email: user.email };
}
