import { cloudinary, extractPublicId, hasCloudinaryCredentials } from "@/app/lib/cloudinary";
import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { isUuid } from "@/app/lib/validation";

interface AlbumRouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export const runtime = "nodejs";

/** Deletes album photos from Cloudinary, skipping any failed asset cleanup. */
async function cleanupCloudinaryPhotos(photoUrls: string[]) {
  if (!hasCloudinaryCredentials || photoUrls.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    photoUrls.map(async (photoUrl) => {
      const publicId = extractPublicId(photoUrl);
      if (!publicId) {
        return;
      }

      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });
    }),
  );

  return results.filter((result) => result.status === "rejected").length;
}

/** Deletes an album and its photos from Supabase, then performs Cloudinary cleanup. */
export async function DELETE(request: Request, context: AlbumRouteContext) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || !isUuid(id)) {
      return apiError("Album id is required and must be valid.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: album, error: albumError } = await admin
      .from("albums")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (albumError) {
      return apiError(albumError.message, 500);
    }

    if (!album) {
      return apiError("Album not found.", 404);
    }

    const { data: photos, error: photosError } = await admin
      .from("photos")
      .select("id, url")
      .eq("album_id", id);

    if (photosError) {
      return apiError(photosError.message, 500);
    }

    const photoRows = (photos ?? []) as Array<{ id: string; url: string }>;
    const photoUrls = photoRows.map((row) => row.url).filter(Boolean);

    const { data: parties, error: partiesError } = await admin
      .from("parties")
      .select("id")
      .eq("album_id", id);

    if (partiesError) {
      return apiError(partiesError.message, 500);
    }

    const partyIds = ((parties ?? []) as Array<{ id: string }>).map((party) => party.id);

    if (partyIds.length > 0) {
      const { error: partyMembersDeleteError } = await admin
        .from("party_members")
        .delete()
        .in("party_id", partyIds);

      if (partyMembersDeleteError) {
        return apiError(partyMembersDeleteError.message, 500);
      }

      const { error: partiesDeleteError } = await admin.from("parties").delete().in("id", partyIds);
      if (partiesDeleteError) {
        return apiError(partiesDeleteError.message, 500);
      }
    }

    if (photoRows.length > 0) {
      const { error: photosDeleteError } = await admin.from("photos").delete().eq("album_id", id);
      if (photosDeleteError) {
        return apiError(photosDeleteError.message, 500);
      }
    }

    const { error: albumDeleteError } = await admin.from("albums").delete().eq("id", id);
    if (albumDeleteError) {
      return apiError(albumDeleteError.message, 500);
    }

    const failedCloudinaryCleanup = await cleanupCloudinaryPhotos(photoUrls);
    const warning =
      failedCloudinaryCleanup > 0
        ? `${failedCloudinaryCleanup} Cloudinary assets could not be deleted automatically.`
        : null;

    const response = apiSuccess(
      {
        id,
        deleted_photo_count: photoRows.length,
        deleted_party_count: partyIds.length,
        failed_cloudinary_cleanup: failedCloudinaryCleanup,
      },
      200,
      { warning },
    );

    if (warning) {
      response.headers.set("x-admin-warning", warning);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete album.";
    return apiError(message, 500);
  }
}