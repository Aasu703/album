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
