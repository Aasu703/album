import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { AdminUserRow } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns all users with aggregate album and photo counts. */
export async function GET(request: Request) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const admin = getSupabaseAdmin();

    const [usersResult, albumsResult, photosResult] = await Promise.all([
      admin.from("users").select("id, name, email, created_at").order("created_at", { ascending: false }),
      admin.from("albums").select("id, created_by"),
      admin.from("photos").select("id, uploaded_by"),
    ]);

    if (usersResult.error || albumsResult.error || photosResult.error) {
      return apiError(usersResult.error?.message || albumsResult.error?.message || photosResult.error?.message || "Failed to fetch users.", 500);
    }

    const users = (usersResult.data ?? []) as Array<{
      id: string;
      name: string;
      email: string;
      created_at: string;
    }>;

    const albums = (albumsResult.data ?? []) as Array<{ id: string; created_by: string | null }>;
    const photos = (photosResult.data ?? []) as Array<{ id: string; uploaded_by: string | null }>;

    const albumCountMap = albums.reduce<Map<string, number>>((acc, album) => {
      if (!album.created_by) {
        return acc;
      }

      acc.set(album.created_by, (acc.get(album.created_by) ?? 0) + 1);
      return acc;
    }, new Map());

    const photoCountMap = photos.reduce<Map<string, number>>((acc, photo) => {
      if (!photo.uploaded_by) {
        return acc;
      }

      acc.set(photo.uploaded_by, (acc.get(photo.uploaded_by) ?? 0) + 1);
      return acc;
    }, new Map());

    const payload: AdminUserRow[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      album_count: albumCountMap.get(user.id) ?? 0,
      photo_count: photoCountMap.get(user.id) ?? 0,
    }));

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin users.";
    return apiError(message, 500);
  }
}