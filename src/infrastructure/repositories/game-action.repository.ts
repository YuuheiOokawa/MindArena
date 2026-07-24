import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Append-only audit log (source spec §19) — never updated or deleted after insert. */
export const gameActionRepository = {
  async record(data: {
    gameSessionId: string;
    participantId: string;
    round: number;
    actionType: string;
    actionData: Prisma.InputJsonValue;
  }) {
    return prisma.gameAction.create({ data });
  },

  async listForSession(gameSessionId: string) {
    return prisma.gameAction.findMany({ where: { gameSessionId }, orderBy: { createdAt: "asc" } });
  },

  async hasSubmitted(gameSessionId: string, participantId: string, round: number) {
    const existing = await prisma.gameAction.findFirst({ where: { gameSessionId, participantId, round } });
    return Boolean(existing);
  },
};
