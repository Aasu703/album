import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const MAX_TRACKED_BUCKETS = 5_000;
const SESSION_COOKIE_NAME = "photo_album_session";
const PUBLIC_IDENTITY_REDIRECT_TARGET = "/album";

const buckets = new Map<string, { count: number; resetAt: number }>();

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_TRACKED_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const forwardedIp = forwardedFor.split(",")[0]?.trim();
  const ip = forwardedIp || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${request.nextUrl.pathname}`;
}

function getContentSecurityPolicy() {
  const allowUnsafeEval =
    process.env.NODE_ENV !== "production" ||
    process.env.CSP_ALLOW_UNSAFE_EVAL === "true";
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    allowUnsafeEval ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "img-src 'self' https://res.cloudinary.com data: blob:",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://*.supabase.co https://api.cloudinary.com",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("Content-Security-Policy", getContentSecurityPolicy());
}

function checkRateLimit(request: NextRequest) {
  const key = getClientKey(request);
  const now = Date.now();

  pruneExpiredBuckets(now);

  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(RATE_LIMIT_MAX_REQUESTS - current.count, 0),
    resetAt: current.resetAt,
  };
}

/** Returns true when route should require a user session cookie. */
function requiresUserSession(pathname: string) {
  return pathname === "/upload" || pathname.startsWith("/upload/") || pathname === "/party/create";
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();
  applySecurityHeaders(response);

  // Admin routes are explicitly excluded from user-session enforcement.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return response;
  }

  if (requiresUserSession(pathname)) {
    const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

    if (!hasSessionCookie) {
      const redirectUrl = new URL(PUBLIC_IDENTITY_REDIRECT_TARGET, request.url);

      const redirectResponse = NextResponse.redirect(redirectUrl);
      applySecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  }

  if (!pathname.startsWith("/api/")) {
    return response;
  }

  const rate = checkRateLimit(request);

  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));

  if (rate.allowed) {
    return response;
  }

  const retryAfterSeconds = Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 1);
  const throttled = NextResponse.json(
    {
      data: null,
      error: "Too many requests. Please try again shortly.",
    },
    { status: 429 },
  );

  applySecurityHeaders(throttled);
  throttled.headers.set("Retry-After", String(retryAfterSeconds));
  throttled.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  throttled.headers.set("X-RateLimit-Remaining", "0");
  throttled.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));

  return throttled;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
