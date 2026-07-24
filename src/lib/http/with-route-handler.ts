import { NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";
import { AppError } from "@/lib/errors/app-error";
import { toApiErrorResponse } from "@/lib/errors/to-api-response";
import { apiSuccess } from "@/types/api";

export interface AuthedContext {
  userId: string;
}

/** Wraps a route handler body with consistent error->ApiResponse mapping. Public (no auth required). */
export function withRouteHandler<T>(fn: (request: Request) => Promise<T>) {
  return async (request: Request) => {
    try {
      const data = await fn(request);
      return NextResponse.json(apiSuccess(data));
    } catch (error) {
      const response = toApiErrorResponse(error);
      const status = response.success ? 200 : statusForCode(response.error.code);
      return NextResponse.json(response, { status });
    }
  };
}

/** Same as withRouteHandler but requires an authenticated session first (source spec §19 ownership checks start here). */
export function withAuthedRouteHandler<T>(fn: (ctx: AuthedContext, request: Request) => Promise<T>) {
  return async (request: Request) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new AppError("UNAUTHORIZED");
      }
      const data = await fn({ userId: session.user.id }, request);
      return NextResponse.json(apiSuccess(data));
    } catch (error) {
      const response = toApiErrorResponse(error);
      const status = response.success ? 200 : statusForCode(response.error.code);
      return NextResponse.json(response, { status });
    }
  };
}

function statusForCode(code: string): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
    case "SESSION_NOT_FOUND":
    case "FRIEND_REQUEST_NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    case "CANNOT_FRIEND_SELF":
      return 400;
    case "ALREADY_JOINED":
    case "CONFLICT":
    case "DUPLICATE_ACTION":
    case "ALREADY_FRIENDS":
    case "FRIEND_REQUEST_EXISTS":
    case "ALREADY_OWNED":
      return 409;
    case "TOURNAMENT_NOT_JOINABLE":
    case "MATCH_NOT_READY":
    case "INSUFFICIENT_FUNDS":
    case "ITEM_NOT_OWNED":
      return 422;
    default:
      return 500;
  }
}
