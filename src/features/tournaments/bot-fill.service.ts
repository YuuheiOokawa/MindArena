import { tournamentParticipantRepository } from "@/infrastructure/repositories/tournament-participant.repository";
import { botProfileRepository } from "@/infrastructure/repositories/bot-profile.repository";
import { ParticipantType } from "@/domain/enums";
import type { BotDifficulty } from "@/domain/enums";

/**
 * Fills the remaining tournament seats with BOTs sampled at the league's configured
 * difficulty (source spec §6). Isolated here so a future real-matchmaking queue can replace
 * only this function — everything downstream just sees 32 TournamentParticipant rows.
 */
export async function fillWithBots(tournamentId: string, botDifficulty: BotDifficulty, maxPlayers: number) {
  const currentCount = await tournamentParticipantRepository.count(tournamentId);
  const needed = maxPlayers - currentCount;
  if (needed <= 0) return;

  const bots = await botProfileRepository.sampleForDifficulty(botDifficulty, needed);

  await tournamentParticipantRepository.createMany(
    bots.map((bot, index) => ({
      tournamentId,
      botId: bot.id,
      type: ParticipantType.BOT,
      displayName: bot.name,
      seed: currentCount + index + 1,
    })),
  );
}
