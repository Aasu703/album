import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { AdminRecentAlbum, AdminRecentPhoto, AdminStats } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns aggregate admin dashboard counts and recent activity lists. */
export async function GET(request: Request) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const admin = getSupabaseAdmin();

    const [
      albumsCountResult,
      photosCountResult,
      usersCountResult,
      partiesCountResult,
      recentAlbumsResult,
      recentPhotosResult,
    ] = await Promise.all([
      admin.from("albums").select("id", { count: "exact", head: true }),
      admin.from("photos").select("id", { count: "exact", head: true }),
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("parties").select("id", { count: "exact", head: true }),
      admin
        .from("albums")
        .select("id, name, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("photos")
        .select("id, title, url, album_id, uploaded_by_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (albumsCountResult.error || photosCountResult.error || usersCountResult.error || partiesCountResult.error) {
      return apiError(
        albumsCountResult.error?.message ||
          photosCountResult.error?.message ||
          usersCountResult.error?.message ||
          partiesCountResult.error?.message ||
          "Failed to fetch admin stats.",
        500,
      );
    }

    if (recentAlbumsResult.error || recentPhotosResult.error) {
      return apiError(recentAlbumsResult.error?.message || recentPhotosResult.error?.message || "Failed to fetch recent activity.", 500);
    }

    const recentAlbumsRows = (recentAlbumsResult.data ?? []) as Array<{
      id: string;
      name: string;
      created_by: string | null;
      created_at: string;
    }>;

    const recentPhotosRows = (recentPhotosResult.data ?? []) as Array<{
      id: string;
      title: string | null;
      url: string;
      album_id: string;
      uploaded_by_name: string | null;
      created_at: string;
    }>;

    const creatorIds = Array.from(
      new Set(recentAlbumsRows.map((album) => album.created_by).filter((value): value is string => Boolean(value))),
    );

    const albumIds = Array.from(new Set(recentPhotosRows.map((photo) => photo.album_id)));

    const [creatorRowsResult, albumRowsResult] = await Promise.all([
      creatorIds.length
        ? admin.from("users").select("id, name").in("id", creatorIds)
        : Promise.resolve({ data: [], error: null }),
      albumIds.length
        ? admin.from("albums").select("id, name").in("id", albumIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (creatorRowsResult.error || albumRowsResult.error) {
      return apiError(creatorRowsResult.error?.message || albumRowsResult.error?.message || "Failed to resolve activity metadata.", 500);
    }

    const creatorMap = new Map(
      ((creatorRowsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const albumMap = new Map(
      ((albumRowsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const recentAlbums: AdminRecentAlbum[] = recentAlbumsRows.map((album) => ({
      id: album.id,
      name: album.name,
      created_at: album.created_at,
      created_by_name: album.created_by ? creatorMap.get(album.created_by) ?? "Unknown" : "Unknown",
    }));

    const recentPhotos: AdminRecentPhoto[] = recentPhotosRows.map((photo) => ({
      id: photo.id,
      title: photo.title,
      url: photo.url,
      created_at: photo.created_at,
      uploaded_by_name: photo.uploaded_by_name,
      album_name: albumMap.get(photo.album_id) ?? null,
    }));

    const payload: AdminStats = {
      total_albums: albumsCountResult.count ?? 0,
      total_photos: photosCountResult.count ?? 0,
      total_users: usersCountResult.count ?? 0,
      total_parties: partiesCountResult.count ?? 0,
      recent_albums: recentAlbums,
      recent_photos: recentPhotos,
    };

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin stats.";
    return apiError(message, 500);
  }
}