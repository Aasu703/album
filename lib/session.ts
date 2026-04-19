import { createHash } from "node:crypto";

import { cookies } from "next/headers";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  userName: string;
  userEmail: string;
  avatarColor: string;
}

const SESSION_COOKIE_NAME = "photo_album_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_SESSION_SECRET_LENGTH = 32;

let cachedSessionSecret: string | null = null;

/** Returns a trimmed environment variable value or empty string when not set. */
function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

/** Derives a stable session password from Supabase service role key as fallback. */
function deriveSessionSecretFromServiceRoleKey() {
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceRoleKey.length < MIN_SESSION_SECRET_LENGTH) {
    return null;
  }

  return createHash("sha256").update(`personal-album-session:${serviceRoleKey}`).digest("hex");
}

/** Resolves SESSION_SECRET and enforces iron-session minimum password length. */
function getSessionSecret() {
  if (cachedSessionSecret) {
    return cachedSessionSecret;
  }

  const explicitSecret = readEnv("SESSION_SECRET");

  if (explicitSecret.length >= MIN_SESSION_SECRET_LENGTH) {
    cachedSessionSecret = explicitSecret;
    return explicitSecret;
  }

  const fallbackSecret = deriveSessionSecretFromServiceRoleKey();

  if (fallbackSecret) {
    cachedSessionSecret = fallbackSecret;
    return fallbackSecret;
  }

  throw new Error(
    "Session encryption secret is not configured. Set SESSION_SECRET to at least 32 characters.",
  );
}

/** Builds the shared iron-session options object for route handlers. */
export function getSessionOptions(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionSecret(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "lax",
      path: "/",
    },
  };
}

/** Returns the current cookie-backed session object for reading/writing auth state. */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

/** Reads only the user payload from the active cookie session if available. */
export async function getSessionUser(request?: Request): Promise<SessionData | null> {
  const session = await getSession();

  void request;

  if (!session.userId || !session.userEmail || !session.userName || !session.avatarColor) {
    return null;
  }

  return {
    userId: session.userId,
    userName: session.userName,
    userEmail: session.userEmail,
    avatarColor: session.avatarColor,
  };
}
