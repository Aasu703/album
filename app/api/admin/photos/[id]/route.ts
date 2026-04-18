import { cloudinary, extractPublicId, hasCloudinaryCredentials } from "@/app/lib/cloudinary";
import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { Photo } from "@/app/lib/types";
import { isUuid } from "@/app/lib/validation";

interface PhotoRouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

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

/** Deletes a photo as admin and refreshes album cover when needed. */
export async function DELETE(request: Request, context: PhotoRouteContext) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || !isUuid(id)) {
      return apiError("Photo id is required and must be valid.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: existingPhoto, error: existingPhotoError } = await admin
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .eq("id", id)
      .maybeSingle();

    if (existingPhotoError) {
      return apiError(existingPhotoError.message, 500);
    }

    if (!existingPhoto) {
      return apiError("Photo not found.", 404);
    }

    const { data: deletedPhoto, error: deleteError } = await admin
      .from("photos")
      .delete()
      .eq("id", id)
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .single();

    if (deleteError) {
      return apiError(deleteError.message, 500);
    }

    let warning: string | null = null;

    const { data: album, error: albumError } = await admin
      .from("albums")
      .select("cover_url")
      .eq("id", existingPhoto.album_id)
      .maybeSingle();

    if (!albumError && album?.cover_url === existingPhoto.url) {
      const { data: latestPhoto, error: latestPhotoError } = await admin
        .from("photos")
        .select("url")
        .eq("album_id", existingPhoto.album_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPhotoError) {
        warning = "Album cover could not be refreshed after deletion.";
      } else {
        const { error: coverError } = await admin
          .from("albums")
          .update({ cover_url: latestPhoto?.url ?? null })
          .eq("id", existingPhoto.album_id);

        if (coverError) {
          warning = "Album cover could not be refreshed after deletion.";
        }
      }
    }

    if (albumError && !warning) {
      warning = "Album cover could not be refreshed after deletion.";
    }

    const cleanupWarning = await deleteCloudinaryAsset(existingPhoto.url);
    if (cleanupWarning && !warning) {
      warning = cleanupWarning;
    }

    const response = apiSuccess(deletedPhoto as Photo, 200, { warning });
    if (warning) {
      response.headers.set("x-admin-warning", warning);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete photo.";
    return apiError(message, 500);
  }
}