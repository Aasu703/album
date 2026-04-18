import { apiError, apiSuccess } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { PartyWithJoinUrl } from "@/app/lib/types";
import { validateJoinCode } from "@/app/lib/validation";

interface PartyContext {
  params: { join_code: string } | Promise<{ join_code: string }>;
}

export const runtime = "nodejs";

/** Builds canonical app URL for party join links. */
function getAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

/** Returns party metadata by join code. */
export async function GET(request: Request, context: PartyContext) {
  try {
    const { join_code: joinCodeParam } = await Promise.resolve(context.params);
    const { value: joinCode, error: joinCodeError } = validateJoinCode(joinCodeParam);

    if (joinCodeError || !joinCode) {
      return apiError(joinCodeError ?? "Invalid join code.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: party, error: partyError } = await admin
      .from("parties")
      .select("id, name, description, host_id, host_name, join_code, album_id, is_active, created_at, expires_at")
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

    return apiSuccess(
      {
        ...(party as PartyWithJoinUrl),
        join_url: `${getAppUrl(request)}/join/${joinCode}`,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch party details.";
    return apiError(message, 500);
  }
}
