import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const MAX_TRACKED_BUCKETS = 5_000;

// Page routes that require a session. A first-line edge guard so unauthenticated
// visitors are redirected to /login before any protected UI renders — the API and
// client-side role checks remain the real authorization boundary. /upload is
// intentionally omitted: it greets signed-out visitors with a sign-in prompt.
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/admin"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

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

function getContentSecurityPolicy(nonce: string) {
  const allowUnsafeEval =
    process.env.NODE_ENV !== "production" ||
    process.env.CSP_ALLOW_UNSAFE_EVAL === "true";
  // Scripts are allow-listed per-request via a nonce rather than 'unsafe-inline', so an
  // attacker-injected <script> (e.g. via a future stored-XSS regression) has no way to
  // guess a valid nonce and will not execute. 'strict-dynamic' lets scripts that Next's
  // own nonce'd bootstrap script loads (e.g. chunked bundles) run without each one
  // needing to be individually allow-listed.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    allowUnsafeEval ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "img-src 'self' https://res.cloudinary.com data: blob:",
    `script-src ${scriptSrc}`,
    // style-src still needs 'unsafe-inline': several components (e.g. ArcCarousel,
    // HeroSection) set React inline `style={{...}}` attributes with per-render computed
    // values (photo positions/rotations), which CSP cannot allow-list via nonce — nonces
    // only cover <style> elements, not inline style="" attributes, and the alternative
    // ('unsafe-hashes') has inconsistent browser support. Inline *script* injection is
    // the materially dangerous vector and is fully locked down above; CSS injection is a
    // much lower-severity residual risk.
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' http://localhost:4000",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("Content-Security-Policy", getContentSecurityPolicy(nonce));
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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Fresh per-request nonce for the CSP's script-src. Threaded through to Server
  // Components via an `x-nonce` request header (read in app/layout.tsx) so the one
  // legitimate inline <script> (the theme-init snippet) can be allow-listed without
  // resorting to 'unsafe-inline'.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, nonce);

  // Signed-in visitors don't need the marketing landing page — send them straight to their
  // dashboard. A stale cookie that no longer authenticates just lands on /dashboard, whose
  // own client guard will bounce it to /login.
  if (pathname === "/") {
    const hasSession =
      request.cookies.has("accessToken") || request.cookies.has("refreshToken");
    if (hasSession) {
      const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
      applySecurityHeaders(redirect, nonce);
      return redirect;
    }
  }

  // Edge auth guard: block protected pages when no session cookie is present.
  // An expired access token with a valid refresh token still passes (the client
  // silently refreshes); only a total absence of both bounces to /login.
  if (isProtectedPath(pathname)) {
    const hasSession =
      request.cookies.has("accessToken") || request.cookies.has("refreshToken");
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(loginUrl);
      applySecurityHeaders(redirect, nonce);
      return redirect;
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

  applySecurityHeaders(throttled, nonce);
  throttled.headers.set("Retry-After", String(retryAfterSeconds));
  throttled.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  throttled.headers.set("X-RateLimit-Remaining", "0");
  throttled.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));

  return throttled;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
