import { NextResponse } from "next/server";

import { apiError } from "@/app/lib/security";
import { getSessionUser } from "@/lib/session";
import type { AuthUser } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns the current authenticated user from the encrypted cookie session, if present. */
export async function GET() {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user: AuthUser = {
      id: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      phone: null,
      role: session.role,
      sellerStatus: session.sellerStatus,
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve session.";
    return apiError(message, 500);
  }
}
