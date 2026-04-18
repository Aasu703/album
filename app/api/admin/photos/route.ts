import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { AdminPhotoRow } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns all photos with album names for admin management views. */
export async function GET(request: Request) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const admin = getSupabaseAdmin();

    const { data: photos, error: photosError } = await admin
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .order("created_at", { ascending: false });

    if (photosError) {
      return apiError(photosError.message, 500);
    }

    const photoRows = (photos ?? []) as Array<{
      id: string;
      album_id: string;
      url: string;
      title: string | null;
      uploaded_by: string | null;
      uploaded_by_name: string | null;
      created_at: string;
    }>;

    const albumIds = Array.from(new Set(photoRows.map((photo) => photo.album_id)));

    const albumRowsResult = albumIds.length
      ? await admin.from("albums").select("id, name").in("id", albumIds)
      : { data: [], error: null };

    if (albumRowsResult.error) {
      return apiError(albumRowsResult.error.message, 500);
    }

    const albumMap = new Map(
      ((albumRowsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const payload: AdminPhotoRow[] = photoRows.map((photo) => ({
      id: photo.id,
      album_id: photo.album_id,
      url: photo.url,
      title: photo.title,
      uploaded_by: photo.uploaded_by,
      uploaded_by_name: photo.uploaded_by_name,
      created_at: photo.created_at,
      album_name: albumMap.get(photo.album_id) ?? null,
    }));

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin photos.";
    return apiError(message, 500);
  }
}