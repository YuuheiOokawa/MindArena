import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { AppError } from "@/lib/errors/app-error";
import type { UpdateCosmeticsInput, UpdateDisplayNameInput, UpdateSettingsInput } from "@/lib/validation/profile.schema";

async function requireProfile(userId: string) {
  const profile = await playerProfileRepository.findByUserId(userId);
  if (!profile) throw new AppError("NOT_FOUND", "プロフィールが見つかりません。");
  return profile;
}

export async function updateMySettings(userId: string, input: UpdateSettingsInput) {
  const profile = await requireProfile(userId);
  return playerProfileRepository.update(profile.id, input);
}

export async function updateMyCosmetics(userId: string, input: UpdateCosmeticsInput) {
  const profile = await requireProfile(userId);
  return playerProfileRepository.update(profile.id, input);
}

export async function updateMyDisplayName(userId: string, input: UpdateDisplayNameInput) {
  const profile = await requireProfile(userId);
  return playerProfileRepository.update(profile.id, input);
}
