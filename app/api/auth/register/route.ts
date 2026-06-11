import { NextResponse } from "next/server";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSession } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register.";
    return apiError(message, 500);
  }
}
