import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export const eventScoreRepository = {
  async findForPlayer(eventId: string, playerProfileId: string) {
    return prisma.eventScore.findUnique({ where: { eventId_playerProfileId: { eventId, playerProfileId } } });
  },

  /** Keyed by eventId — used when listing several events at once (features/events/event.service.ts's
   * listEvents) so each event's card can show the viewer's own progress without an N+1 query. */
  async findForPlayerAcrossEvents(eventIds: string[], playerProfileId: string) {
    const rows = await prisma.eventScore.findMany({ where: { eventId: { in: eventIds }, playerProfileId } });
    return new Map(rows.map((r) => [r.eventId, r.score]));
  },

  /** Atomic upsert-increment (ON CONFLICT DO UPDATE) — race-safe against two concurrent match
   * finalizations crediting the same player's event score at once, same pattern as
   * progress.service.ts's awardLeagueTrophy. */
  async increment(tx: Tx, eventId: string, playerProfileId: string) {
    await tx.eventScore.upsert({
      where: { eventId_playerProfileId: { eventId, playerProfileId } },
      update: { score: { increment: 1 } },
      create: { eventId, playerProfileId, score: 1 },
    });
  },

  async listTop(eventId: string, limit: number) {
    return prisma.eventScore.findMany({
      where: { eventId },
      orderBy: { score: "desc" },
      take: limit,
      include: { playerProfile: { select: { id: true, displayName: true, selectedAvatarIconId: true, customAvatarUrl: true } } },
    });
  },

  async countAboveScore(eventId: string, score: number) {
    return prisma.eventScore.count({ where: { eventId, score: { gt: score } } });
  },
};
