import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { AdminAlbumRow } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns admin album listing with creator names and photo counts. */
export async function GET(request: Request) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const admin = getSupabaseAdmin();

    const [albumsResult, photosResult] = await Promise.all([
      admin
        .from("albums")
        .select("id, name, cover_url, created_by, created_at")
        .order("created_at", { ascending: false }),
      admin.from("photos").select("id, album_id, url"),
    ]);

    if (albumsResult.error || photosResult.error) {
      return apiError(albumsResult.error?.message || photosResult.error?.message || "Failed to fetch albums.", 500);
    }

    const albums = (albumsResult.data ?? []) as Array<{
      id: string;
      name: string;
      cover_url: string | null;
      created_by: string | null;
      created_at: string;
    }>;

    const photoRows = (photosResult.data ?? []) as Array<{ id: string; album_id: string; url: string }>;

    const creatorIds = Array.from(
      new Set(albums.map((album) => album.created_by).filter((value): value is string => Boolean(value))),
    );

    const creatorRowsResult = creatorIds.length
      ? await admin.from("users").select("id, name").in("id", creatorIds)
      : { data: [], error: null };

    if (creatorRowsResult.error) {
      return apiError(creatorRowsResult.error.message, 500);
    }

    const creatorMap = new Map(
      ((creatorRowsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const photoCountMap = photoRows.reduce<Map<string, number>>((acc, row) => {
      const current = acc.get(row.album_id) ?? 0;
      acc.set(row.album_id, current + 1);
      return acc;
    }, new Map());

    const photoUrlMap = photoRows.reduce<Map<string, string[]>>((acc, row) => {
      const current = acc.get(row.album_id) ?? [];
      current.push(row.url);
      acc.set(row.album_id, current);
      return acc;
    }, new Map());

    const payload: AdminAlbumRow[] = albums.map((album) => ({
      id: album.id,
      name: album.name,
      cover_url: album.cover_url,
      created_by: album.created_by,
      created_by_name: album.created_by ? creatorMap.get(album.created_by) ?? "Unknown" : "Unknown",
      created_at: album.created_at,
      photo_count: photoCountMap.get(album.id) ?? 0,
      photo_urls: photoUrlMap.get(album.id) ?? [],
    }));

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin albums.";
    return apiError(message, 500);
  }
}