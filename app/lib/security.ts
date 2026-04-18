import { NextResponse } from "next/server";

import type { ApiResponse } from "@/app/lib/types";

/** Returns a normalized set of trusted origins for mutating requests. */
function getTrustedOrigins(requestOrigin: string) {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([requestOrigin, ...configuredOrigins]);
}

/** Validates whether request Origin header is trusted for state-changing routes. */
export function isTrustedOrigin(request: Request) {
  const originHeader = request.headers.get("origin")?.trim();

  // Allow non-browser clients that do not send Origin by default.
  if (!originHeader) {
    return true;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    const trustedOrigins = getTrustedOrigins(requestOrigin);
    return trustedOrigins.has(originHeader);
  } catch {
    return false;
  }
}

/** Builds a typed API error response payload. */
export function apiError(message: string, status: number) {
  return NextResponse.json(
    { data: null, error: message } satisfies ApiResponse<null>,
    { status },
  );
}

/** Builds a typed API success response with optional extra fields. */
export function apiSuccess<T>(data: T, status = 200, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    {
      data,
      error: null,
      ...extra,
    } satisfies ApiResponse<T> & Record<string, unknown>,
    { status },
  );
}

/** Resolves a best-effort client IP from request headers. */
export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor.split(",")[0]?.trim();

  return (
    forwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}
