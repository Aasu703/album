import { apiError, apiSuccess } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { PartyMember, PartyWithJoinUrl } from "@/app/lib/types";
import { validateJoinCode } from "@/app/lib/validation";
import { generateAvatarColor } from "@/lib/avatar";

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

    const { data: membersRows, error: membersError } = await admin
      .from("party_members")
      .select("user_id, user_name")
      .eq("party_id", party.id);

    if (membersError) {
      return apiError(membersError.message, 500);
    }

    const memberRows = (membersRows ?? []) as Array<{ user_id: string; user_name: string }>;
    const memberUserIds = Array.from(new Set(memberRows.map((row) => row.user_id)));

    const userRowsResult = memberUserIds.length
      ? await admin.from("users").select("id, email").in("id", memberUserIds)
      : { data: [], error: null };

    if (userRowsResult.error) {
      return apiError(userRowsResult.error.message, 500);
    }

    const colorByUserId = new Map(
      ((userRowsResult.data ?? []) as Array<{ id: string; email: string }>).map((row) => [
        row.id,
        generateAvatarColor(row.email),
      ]),
    );

    const members: PartyMember[] = memberRows.map((member) => ({
      user_id: member.user_id,
      user_name: member.user_name,
      avatar_color: colorByUserId.get(member.user_id) ?? "#3A86FF",
    }));

    return apiSuccess(
      {
        ...(party as PartyWithJoinUrl),
        join_url: `${getAppUrl(request)}/join/${joinCode}`,
        members,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch party details.";
    return apiError(message, 500);
  }
}
