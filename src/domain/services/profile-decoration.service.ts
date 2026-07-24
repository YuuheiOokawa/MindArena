export interface FrameTier {
  id: string;
  code: string;
  name: string;
  minPoints: number;
  glowIntensity: "none" | "subtle" | "medium" | "strong";
}

/**
 * The tier whose minPoints threshold is the highest one the given points total still clears.
 * Tiers list is expected sorted ascending by minPoints; sorted defensively here anyway.
 */
export function resolveFrameTier(points: number, tiers: FrameTier[]): FrameTier {
  const ordered = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const eligible = ordered.filter((tier) => points >= tier.minPoints);
  if (eligible.length === 0) {
    throw new Error("Frame tier configuration must include a 0-point tier.");
  }
  return eligible[eligible.length - 1];
}

export function resolveNextFrameTier(points: number, tiers: FrameTier[]): FrameTier | null {
  const ordered = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  return ordered.find((tier) => tier.minPoints > points) ?? null;
}
