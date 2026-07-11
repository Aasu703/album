import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/api-client";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSession } from "@/lib/session";
import type { AuthUser } from "@/app/lib/types";

export const runtime = "nodejs";

interface LoginData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/** Logs in a user against the backend and persists the session/tokens in an encrypted cookie. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const body = await request.json();
    const result = await backendFetch<{ success: boolean; data?: LoginData; message?: string }>(
      "/auth/login",
      { method: "POST", body },
    );

    if (!result.ok || !result.body.data) {
      return NextResponse.json(
        { success: false, message: result.body.message ?? "Login failed." },
        { status: result.status },
      );
    }

    const { user, accessToken, refreshToken } = result.body.data;
    const session = await getSession();

    session.userId = user.id;
    session.email = user.email;
    session.firstName = user.firstName;
    session.lastName = user.lastName;
    session.role = user.role;
    session.sellerStatus = user.sellerStatus;
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;

    await session.save();

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login.";
    return apiError(message, 500);
  }
}
