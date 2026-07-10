import { NextResponse } from "next/server";

import { apiError } from "@/app/lib/security";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

/** Returns current authenticated user from encrypted cookie session, if present. */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.userId,
          name: user.userName,
          email: user.userEmail ?? null,
          avatarColor: user.avatarColor,
          isGuest: user.isGuest ?? false,
          guestId: user.guestId ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve session.";
    return apiError(message, 500);
  }
}
