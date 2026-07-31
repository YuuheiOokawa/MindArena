import { describe, expect, it, vi } from "vitest";
import { memoizeWithTtl } from "@/infrastructure/database/ttl-cache";

describe("memoizeWithTtl", () => {
  it("calls the loader once and reuses the cached value within the TTL window", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    const memoized = memoizeWithTtl(loader, 10_000);

    expect(await memoized()).toBe("value");
    expect(await memoized()).toBe("value");
    expect(await memoized()).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the TTL has expired", async () => {
    vi.useFakeTimers();
    try {
      const loader = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
      const memoized = memoizeWithTtl(loader, 1_000);

      expect(await memoized()).toBe("first");
      vi.advanceTimersByTime(1_001);
      expect(await memoized()).toBe("second");
      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("collapses concurrent cache-miss callers into a single loader invocation", async () => {
    let resolveLoader: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );
    const memoized = memoizeWithTtl(loader, 10_000);

    const first = memoized();
    const second = memoized();
    const third = memoized();
    resolveLoader!("shared");

    expect(await Promise.all([first, second, third])).toEqual(["shared", "shared", "shared"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache a rejection — the next call retries the loader", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("recovered");
    const memoized = memoizeWithTtl(loader, 10_000);

    await expect(memoized()).rejects.toThrow("boom");
    expect(await memoized()).toBe("recovered");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
