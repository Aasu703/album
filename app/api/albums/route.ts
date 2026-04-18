import { NextResponse } from "next/server";

import { apiError, apiSuccess, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { Album, ApiResponse } from "@/app/lib/types";
import { isUuid, validateAlbumName } from "@/app/lib/validation";

interface CreateAlbumBody {
  name?: string;
  created_by?: string;
}

/** Fetches all albums ordered by creation date. */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("albums")
      .select("id, name, cover_url, created_by, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      const payload: ApiResponse<Album[]> = {
        data: null,
        error: error.message,
      };

      return NextResponse.json(payload, { status: 500 });
    }

    return apiSuccess((data ?? []) as Album[], 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch albums.";
    return apiError(message, 500);
  }
}

/** Creates a new album from validated request body data. */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("Request origin is not allowed.", 403);
    }

    let body: CreateAlbumBody;

    try {
      body = (await request.json()) as CreateAlbumBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const { value: name, error: nameError } = validateAlbumName(body.name);
    if (nameError || !name) {
      return apiError(nameError ?? "Album name is required.", 400);
    }

    const createdBy = body.created_by?.trim();
    if (!createdBy || !isUuid(createdBy)) {
      return apiError("created_by must be a valid identifier.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("id", createdBy)
      .maybeSingle();

    if (userError) {
      return apiError(userError.message, 500);
    }

    if (!user) {
      return apiError("Creator identity not found.", 404);
    }

    const { data, error } = await supabase
      .from("albums")
      .insert({
        name,
        cover_url: null,
        created_by: createdBy,
      })
      .select("id, name, cover_url, created_by, created_at")
      .single();

    if (error) {
      const isConflict = error.code === "23505" || /duplicate key/i.test(error.message);
      if (isConflict) {
        return apiError("An album with this name already exists.", 409);
      }

      return apiError(error.message, 500);
    }

    return apiSuccess(data as Album, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create album.";
    return apiError(message, 500);
  }
}
