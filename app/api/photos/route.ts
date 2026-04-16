import { NextResponse } from "next/server";

import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { supabase } from "@/app/lib/supabase";
import type { ApiResponse, Photo } from "@/app/lib/types";

/** Fetches photos for a given album id from the query string. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("album_id")?.trim();

  if (!albumId) {
    return NextResponse.json(
      { data: null, error: "album_id query parameter is required." } satisfies ApiResponse<null>,
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("photos")
    .select("id, album_id, url, title, created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message } satisfies ApiResponse<null>,
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: (data ?? []) as Photo[], error: null } satisfies ApiResponse<Photo[]>,
    { status: 200 },
  );
}

/** Deletes a single photo by id using query parameter or JSON body. */
export async function DELETE(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  const requestUrl = new URL(request.url);
  const queryId = requestUrl.searchParams.get("id")?.trim();

  let bodyId: string | undefined;

  if (!queryId) {
    try {
      const body = (await request.json()) as { id?: string };
      bodyId = body.id?.trim();
    } catch {
      bodyId = undefined;
    }
  }

  const photoId = queryId ?? bodyId;

  if (!photoId) {
    return apiError("Photo id is required.", 400);
  }

  const { data, error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .select("id, album_id, url, title, created_at")
    .single();

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json(
    { data: data as Photo, error: null } satisfies ApiResponse<Photo>,
    { status: 200 },
  );
}
