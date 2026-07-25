import { prisma } from "@/infrastructure/database/prisma";
import { ParticipantStatus, ParticipantType } from "@/domain/enums";
import type { Prisma } from "@/generated/prisma/client";

export interface NewParticipant {
  tournamentId: string;
  playerId?: string;
  botId?: string;
  type: ParticipantType;
  displayName: string;
  seed: number;
}

export const tournamentParticipantRepository = {
  async count(tournamentId: string) {
    return prisma.tournamentParticipant.count({ where: { tournamentId } });
  },

  async createMany(participants: NewParticipant[]) {
    for (const p of participants) {
      if (Boolean(p.playerId) === Boolean(p.botId)) {
        throw new Error("A tournament participant must have exactly one of playerId or botId.");
      }
    }
    await prisma.tournamentParticipant.createMany({ data: participants });
  },

  async listForTournament(tournamentId: string) {
    return prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { player: true, bot: true },
      orderBy: { seed: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.tournamentParticipant.findUniqueOrThrow({ where: { id }, include: { player: true, bot: true } });
  },

  /** The participant who originally created the tournament — always seed 1, the sole entrant
   * added before anyone else joins or gets BOT-filled in. Used to gate "start now" to the host. */
  async findCreator(tournamentId: string) {
    return prisma.tournamentParticipant.findFirst({ where: { tournamentId, seed: 1 } });
  },

  async isPlayerAlreadyIn(tournamentId: string, playerId: string) {
    const existing = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId } },
    });
    return Boolean(existing);
  },

  async markEliminated(id: string, round: number, placement?: number) {
    const data: Prisma.TournamentParticipantUpdateInput = {
      status: ParticipantStatus.ELIMINATED,
      eliminatedRound: round,
    };
    if (placement) data.finalPlacement = placement;
    return prisma.tournamentParticipant.update({ where: { id }, data });
  },

  async markChampion(id: string) {
    return prisma.tournamentParticipant.update({ where: { id }, data: { finalPlacement: 1 } });
  },

  /** A player voluntarily leaving a tournament they're still ACTIVE in. Distinct from
   * `markEliminated` (a real loss) — see withdraw.service.ts. */
  async markWithdrawn(id: string) {
    return prisma.tournamentParticipant.update({ where: { id }, data: { status: ParticipantStatus.WITHDRAWN } });
  },

  /** Safe only before any match references this row (RECRUITING — no bracket generated yet). */
  async delete(id: string) {
    await prisma.tournamentParticipant.delete({ where: { id } });
  },

  /** Safe only before any match exists for the tournament (RECRUITING) — used when its creator
   * cancels the whole lobby. */
  async deleteAllForTournament(tournamentId: string) {
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
  },
};
