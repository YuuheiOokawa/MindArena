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
    throw new AppError("VALIDATION_ERROR", "入力内容を確認してください。");
  }
  return parsed.data;
}
