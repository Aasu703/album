import { cookies } from "next/headers";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "buyer" | "seller" | "admin";
  sellerStatus: "none" | "pending" | "approved" | "rejected";
  accessToken: string;
  refreshToken: string;
}

const SESSION_COOKIE_NAME = "painting_marketplace_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_SESSION_SECRET_LENGTH = 32;

/** Returns a trimmed environment variable value or empty string when not set. */
function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

/** Resolves SESSION_SECRET and enforces iron-session minimum password length. */
function getSessionSecret() {
  const secret = readEnv("SESSION_SECRET");

  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      "Session encryption secret is not configured. Set SESSION_SECRET to at least 32 characters.",
    );
  }

  return secret;
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

/** Reads the current session's user/token payload if a valid session exists. */
export async function getSessionUser(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session.userId || !session.accessToken) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    sellerStatus: session.sellerStatus,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}
