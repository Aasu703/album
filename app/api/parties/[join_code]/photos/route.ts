import { apiError, apiSuccess } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { Photo } from "@/app/lib/types";
import { validateJoinCode } from "@/app/lib/validation";

interface PhotosContext {
  params: { join_code: string } | Promise<{ join_code: string }>;
}

export const runtime = "nodejs";

/** Returns all photos for the party album referenced by join code. */
export async function GET(_request: Request, context: PhotosContext) {
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

    const { data: photos, error: photosError } = await admin
      .from("photos")
      .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
      .eq("album_id", party.album_id)
      .order("created_at", { ascending: false });

    if (photosError) {
      return apiError(photosError.message, 500);
    }

    return apiSuccess((photos ?? []) as Photo[], 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch party photos.";
    return apiError(message, 500);
  }
}
