import { playerProfileRepository } from "@/infrastructure/repositories/player-profile.repository";
import { isTitleUnlocked } from "@/domain/services/title-unlock.service";
import { computeTitleUnlockStats } from "./title-unlock-stats";
import { TITLES } from "@/config/titles";
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

  if (input.selectedTitleId) {
    const title = TITLES.find((t) => t.id === input.selectedTitleId);
    if (!title) throw new AppError("VALIDATION_ERROR", "無効な称号です。");
    const stats = await computeTitleUnlockStats(profile);
    if (!isTitleUnlocked(title.id, stats)) {
      throw new AppError("VALIDATION_ERROR", "その称号はまだ獲得していません。");
    }
  }

  return playerProfileRepository.update(profile.id, input);
}

export async function updateMyDisplayName(userId: string, input: UpdateDisplayNameInput) {
  const profile = await requireProfile(userId);
  return playerProfileRepository.update(profile.id, input);
}
