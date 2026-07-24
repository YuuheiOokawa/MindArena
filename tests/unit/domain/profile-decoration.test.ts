import { describe, expect, it } from "vitest";
import { resolveFrameTier, resolveNextFrameTier } from "@/domain/services/profile-decoration.service";
import { FRAME_TIERS } from "@/config/frames";

describe("profile-decoration.service", () => {
  it("resolves the simple frame at 0 points", () => {
    expect(resolveFrameTier(0, FRAME_TIERS).id).toBe("simple");
  });

  it("resolves the boundary tier exactly at its threshold", () => {
    expect(resolveFrameTier(500, FRAME_TIERS).id).toBe("bronze");
  });

  it("does not resolve a tier one point below its threshold", () => {
    expect(resolveFrameTier(499, FRAME_TIERS).id).toBe("simple");
  });

  it("resolves the legend frame at the top", () => {
    expect(resolveFrameTier(50000, FRAME_TIERS).id).toBe("legend");
  });

  it("returns null next tier once at the top", () => {
    expect(resolveNextFrameTier(50000, FRAME_TIERS)).toBeNull();
  });
});
