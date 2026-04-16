import { NextResponse } from "next/server";

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
  let body: CreateAlbumBody;

  try {
    body = (await request.json()) as CreateAlbumBody;
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body." } satisfies ApiResponse<null>,
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { data: null, error: "Album name is required." } satisfies ApiResponse<null>,
      { status: 400 },
    );
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
    return NextResponse.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: data as Album, error: null } satisfies ApiResponse<Album>,
    { status: 201 },
  );
}
