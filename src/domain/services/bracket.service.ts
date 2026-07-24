import { seededShuffle } from "@/lib/utils/seeded-random";

export interface BracketParticipantRef {
  participantId: string;
  displayName: string;
}

export interface BracketMatchPlan {
  round: number;
  matchNumber: number;
  participant1Id: string;
  participant2Id: string;
}

/**
 * Shuffles participants deterministically (seeded by the tournament id, so results are
 * reproducible/testable) and pairs them into round-1 matches in bracket order.
 * Requires an even, power-of-two-friendly participant count (MIND ARENA always calls this
 * with exactly 32).
 */
export function generateBracket(participants: BracketParticipantRef[], seed: number): BracketMatchPlan[] {
  if (participants.length < 2 || participants.length % 2 !== 0) {
    throw new Error("generateBracket requires an even number of participants (>= 2).");
  }

  const shuffled = seededShuffle(participants, seed);
  const matches: BracketMatchPlan[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      round: 1,
      matchNumber: i / 2 + 1,
      participant1Id: shuffled[i].participantId,
      participant2Id: shuffled[i + 1].participantId,
    });
  }

  return matches;
}

/**
 * Given the winners of a completed round in matchNumber order, pairs them into the next
 * round's matches: winner of match 1 vs winner of match 2, winner of match 3 vs match 4, etc.
 * This is the standard single-elimination seeding rule and is what keeps bracket position
 * meaningful round over round.
 */
export function pairNextRound(round: number, orderedWinnerIds: string[]): BracketMatchPlan[] {
  if (orderedWinnerIds.length % 2 !== 0) {
    throw new Error("pairNextRound requires an even number of winners.");
  }

  const matches: BracketMatchPlan[] = [];
  for (let i = 0; i < orderedWinnerIds.length; i += 2) {
    matches.push({
      round,
      matchNumber: i / 2 + 1,
      participant1Id: orderedWinnerIds[i],
      participant2Id: orderedWinnerIds[i + 1],
    });
  }
  return matches;
}

/** Total rounds needed for a bracket of the given size (32 -> 5, matching source spec §6). */
export function totalRoundsFor(participantCount: number): number {
  return Math.ceil(Math.log2(participantCount));
}

export function isFinalRound(round: number, participantCount: number): boolean {
  return round === totalRoundsFor(participantCount);
}
