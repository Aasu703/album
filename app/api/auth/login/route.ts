import { NextResponse } from "next/server";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSession } from "@/lib/session";
import { generateAvatarColor } from "@/lib/avatar";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export const runtime = "nodejs";

/** Logs in a user by proxying to the backend and persisting identity in session. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json(payload, { status: response.status });
    }

    const { user, accessToken } = payload.data;
    const avatarColor = generateAvatarColor(user.email);
    const session = await getSession();

    session.userId = user.id || user._id;
    session.userName = `${user.Firstname} ${user.Lastname}`;
    session.userEmail = user.email;
    session.avatarColor = avatarColor;
    // Store the access token in session so we can use it for backend calls if needed
    (session as any).accessToken = accessToken;

    await session.save();

    return NextResponse.json(
      {
        success: true,
        user: {
          id: session.userId,
          name: session.userName,
          email: session.userEmail,
          avatarColor,
        },
        token: accessToken
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login.";
    return apiError(message, 500);
  }
}
