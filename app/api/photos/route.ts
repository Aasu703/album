import { NextResponse } from "next/server";

import {
  cloudinary,
  extractPublicId,
  hasCloudinaryCredentials,
} from "@/app/lib/cloudinary";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { ApiResponse, Photo } from "@/app/lib/types";
import { isUuid } from "@/app/lib/validation";

export const runtime = "nodejs";

/** Best-effort Cloudinary cleanup that never throws. */
async function deleteCloudinaryAsset(photoUrl: string) {
  if (!hasCloudinaryCredentials) {
    return null;
  }

  const publicId = extractPublicId(photoUrl);
  if (!publicId) {
    return null;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    return null;
  } catch {
    return "Cloud image cleanup failed after DB deletion.";
  }
}

/** Fetches photos for a given album id from the query string. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get("album_id")?.trim();

    if (!albumId || !isUuid(albumId)) {
      return NextResponse.json(
        {
          data: null,
          error: "album_id query parameter is required and must be valid.",
        } satisfies ApiResponse<null>,
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch photos.";
    return apiError(message, 500);
  }
}

/** Deletes a single photo by id using query parameter or JSON body. */
export async function DELETE(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("Request origin is not allowed.", 403);
    }

    const requestUrl = new URL(request.url);
    const queryId = requestUrl.searchParams.get("id")?.trim();

    let bodyId: string | undefined;
    let actorId: string | undefined;

    try {
      const body = (await request.json()) as { id?: string; user_id?: string };
      bodyId = body.id?.trim();
      actorId = body.user_id?.trim();
    } catch {
      bodyId = undefined;
      actorId = undefined;
    }

    const photoId = queryId ?? bodyId;

    if (!photoId || !isUuid(photoId)) {
      return apiError("Photo id is required.", 400);
    }

    if (!actorId || !isUuid(actorId)) {
      return apiError("user_id is required for delete operations.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: actor, error: actorError } = await admin
      .from("users")
      .select("id")
      .eq("id", actorId)
      .maybeSingle();

    if (actorError) {
      return apiError(actorError.message, 500);
    }

    if (!actor) {
      return apiError("Actor identity not found.", 404);
    }

    const { data: existingPhoto, error: existingPhotoError } = await supabase
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .eq("id", photoId)
      .maybeSingle();

    if (existingPhotoError) {
      return apiError(existingPhotoError.message, 500);
    }

    if (!existingPhoto) {
      return apiError("Photo not found.", 404);
    }

    const { data: albumOwner, error: albumOwnerError } = await supabase
      .from("albums")
      .select("created_by")
      .eq("id", existingPhoto.album_id)
      .maybeSingle();

    if (albumOwnerError) {
      return apiError(albumOwnerError.message, 500);
    }

    const canDelete = existingPhoto.uploaded_by === actorId || albumOwner?.created_by === actorId;

    if (!canDelete) {
      return apiError("You are not allowed to delete this photo.", 403);
    }

    const { data, error } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId)
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .single();

    if (error) {
      return apiError(error.message, 500);
    }

    let warning: string | null = null;

    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("cover_url")
      .eq("id", existingPhoto.album_id)
      .maybeSingle();

    if (albumError) {
      warning = "Album cover could not be refreshed after deletion.";
    } else if (album?.cover_url === existingPhoto.url) {
      const { data: latestPhoto, error: latestPhotoError } = await supabase
        .from("photos")
        .select("url")
        .eq("album_id", existingPhoto.album_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPhotoError) {
        warning = "Album cover could not be refreshed after deletion.";
      } else {
        const { error: coverUpdateError } = await supabase
          .from("albums")
          .update({ cover_url: latestPhoto?.url ?? null })
          .eq("id", existingPhoto.album_id);

        if (coverUpdateError) {
          warning = "Album cover could not be refreshed after deletion.";
        }
      }
    }

    const cleanupWarning = await deleteCloudinaryAsset(existingPhoto.url);
    if (cleanupWarning && !warning) {
      warning = cleanupWarning;
    }

    const response = NextResponse.json(
      {
        data: data as Photo,
        error: null,
        warning,
      } satisfies ApiResponse<Photo> & { warning: string | null },
      { status: 200 },
    );

    if (warning) {
      response.headers.set("x-delete-warning", warning);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete photo.";
    return apiError(message, 500);
  }
}
