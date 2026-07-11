import { NextResponse } from "next/server";

import { backendFetch } from "@/app/lib/api-client";
import { apiError, isTrustedOrigin } from "@/app/lib/security";

export const runtime = "nodejs";

/** Registers a new user against the backend. Does not establish a session. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const body = await request.json();
    const result = await backendFetch<{ success: boolean; message?: string }>("/auth/register", {
      method: "POST",
      body,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.body.message ?? "Registration failed." },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register.";
    return apiError(message, 500);
  }
}
