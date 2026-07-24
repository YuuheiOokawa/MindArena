import { ZodError } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logging/logger";
import { apiError, type ApiResponse } from "@/types/api";

/**
 * Converts any thrown value from a route handler / server action into a safe ApiResponse.
 * Unexpected errors are logged with full detail server-side and reduced to a generic,
 * user-facing message on the wire — never leak stack traces or raw DB errors to the client.
 */
export function toApiErrorResponse(error: unknown, context?: Record<string, unknown>): ApiResponse<never> {
  if (error instanceof AppError) {
    return apiError(error.code, error.message);
  }

  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", "入力内容を確認してください。");
  }

  logger.error("Unhandled error in API layer", error, context);
  return apiError("INTERNAL_ERROR", "予期しないエラーが発生しました。時間をおいて再度お試しください。");
}
