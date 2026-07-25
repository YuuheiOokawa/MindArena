import type { ZodType } from "zod";
import { AppError } from "@/lib/errors/app-error";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "リクエストの形式が正しくありません。");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Surface the schema's own message (e.g. "画像サイズが大きすぎます。") when it has one,
    // instead of always collapsing to the generic fallback — Zod's first issue is usually the
    // most actionable one to show.
    const message = parsed.error.issues[0]?.message;
    throw new AppError("VALIDATION_ERROR", message || undefined);
  }
  return parsed.data;
}
