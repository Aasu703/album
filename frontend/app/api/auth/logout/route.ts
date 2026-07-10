import { NextResponse } from "next/server";

import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** Destroys the current encrypted cookie session. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to logout.";
    return apiError(message, 500);
  }
}
