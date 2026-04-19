import { apiError, apiSuccess } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { Photo } from "@/app/lib/types";
import { validateJoinCode } from "@/app/lib/validation";
import { generateAvatarColor } from "@/lib/avatar";

interface PhotosContext {
  params: { join_code: string } | Promise<{ join_code: string }>;
}

export const runtime = "nodejs";

/** Returns all photos for the party album referenced by join code. */
export async function GET(request: Request, context: PhotosContext) {
  try {
    const { join_code: joinCodeParam } = await Promise.resolve(context.params);
    const { value: joinCode, error: joinCodeError } = validateJoinCode(joinCodeParam);

    if (joinCodeError || !joinCode) {
      return apiError(joinCodeError ?? "Invalid join code.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: party, error: partyError } = await admin
      .from("parties")
      .select("album_id, is_active, expires_at")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (partyError) {
      return apiError(partyError.message, 500);
    }

    if (!party) {
      return apiError("Party not found.", 404);
    }

    if (!party.is_active) {
      return apiError("This party is no longer active.", 410);
    }

    if (party.expires_at && new Date(party.expires_at).getTime() <= Date.now()) {
      return apiError("This party has expired.", 410);
    }

    const afterParam = new URL(request.url).searchParams.get("after")?.trim();
    let afterIso: string | null = null;

    if (afterParam) {
      const parsedAfter = new Date(afterParam);
      if (Number.isNaN(parsedAfter.getTime())) {
        return apiError("after must be a valid ISO timestamp.", 400);
      }

      afterIso = parsedAfter.toISOString();
    }

    let photosQuery = admin
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .eq("album_id", party.album_id)
      .order("created_at", { ascending: false });

    if (afterIso) {
      photosQuery = photosQuery.gt("created_at", afterIso);
    }

    const { data: photos, error: photosError } = await photosQuery;

    if (photosError) {
      return apiError(photosError.message, 500);
    }

    const photoRows = ((photos ?? []) as Photo[]).filter((photo) => typeof photo.url === "string" && photo.url.trim().length > 0);
    const uploaderIds = Array.from(
      new Set(photoRows.map((photo) => photo.uploaded_by).filter((value): value is string => Boolean(value))),
    );

    const uploaderRowsResult = uploaderIds.length
      ? await admin.from("users").select("id, email").in("id", uploaderIds)
      : { data: [], error: null };

    if (uploaderRowsResult.error) {
      return apiError(uploaderRowsResult.error.message, 500);
    }

    const colorByUserId = new Map(
      ((uploaderRowsResult.data ?? []) as Array<{ id: string; email: string }>).map((row) => [
        row.id,
        generateAvatarColor(row.email),
      ]),
    );

    const payload: Photo[] = photoRows.map((photo) => ({
      ...photo,
      uploaded_by_avatar_color: photo.uploaded_by
        ? colorByUserId.get(photo.uploaded_by) ?? null
        : null,
    }));

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch party photos.";
    return apiError(message, 500);
  }
}
