import { NextResponse } from "next/server";

import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { supabase } from "@/app/lib/supabase";
import type { Album, ApiResponse } from "@/app/lib/types";

interface CreateAlbumBody {
  name?: string;
}

/** Fetches all albums ordered by creation date. */
export async function GET() {
  const { data, error } = await supabase
    .from("albums")
    .select("id, name, cover_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    const payload: ApiResponse<Album[]> = {
      data: null,
      error: error.message,
    };

    return NextResponse.json(payload, { status: 500 });
  }

  const payload: ApiResponse<Album[]> = {
    data: (data ?? []) as Album[],
    error: null,
  };

  return NextResponse.json(payload, { status: 200 });
}

/** Creates a new album from validated request body data. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  let body: CreateAlbumBody;

  try {
    body = (await request.json()) as CreateAlbumBody;
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return apiError("Album name is required.", 400);
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      name,
      cover_url: null,
    })
    .select("id, name, cover_url, created_at")
    .single();

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json(
    { data: data as Album, error: null } satisfies ApiResponse<Album>,
    { status: 201 },
  );
}
