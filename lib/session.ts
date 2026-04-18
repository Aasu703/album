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

/** Resolves SESSION_SECRET and enforces iron-session minimum password length. */
function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be defined and at least 32 characters long.");
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
export async function getSession(_request?: Request): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

/** Reads only the user payload from the active cookie session if available. */
export async function getSessionUser(request?: Request): Promise<SessionData | null> {
  const session = await getSession(request);

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
