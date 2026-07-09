import { apiError, apiSuccess, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { validateJoinCode } from "@/app/lib/validation";
import { getSessionUser } from "@/lib/session";

interface JoinContext {
  params: { join_code: string } | Promise<{ join_code: string }>;
}

export const runtime = "nodejs";

/** Records a user's participation in a party by join code. */
export async function POST(request: Request, context: JoinContext) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const { join_code: joinCodeParam } = await Promise.resolve(context.params);
    const { value: joinCode, error: joinCodeError } = validateJoinCode(joinCodeParam);

    if (joinCodeError || !joinCode) {
      return apiError(joinCodeError ?? "Invalid join code.", 400);
    }

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return apiError("Unauthorized.", 401);
    }

    const admin = getSupabaseAdmin();

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, name")
      .eq("id", sessionUser.userId)
      .maybeSingle();

    if (userError) {
      return apiError(userError.message, 500);
    }

    if (!user) {
      return apiError("User identity not found.", 404);
    }

    const { data: party, error: partyError } = await admin
      .from("parties")
      .select("id, join_code, is_active, expires_at")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (partyError) {
      return apiError(partyError.message, 500);
    }

    const partyRecord = party as {
      id: string;
      join_code: string;
      is_active: boolean;
      expires_at: string | null;
    } | null;

    if (!partyRecord) {
      return apiError("Party not found.", 404);
    }

    if (!partyRecord.is_active) {
      return apiError("This party is no longer active.", 410);
    }

    if (partyRecord.expires_at && new Date(partyRecord.expires_at).getTime() <= Date.now()) {
      return apiError("This party has expired.", 410);
    }

    const { data: existingMembership, error: existingMembershipError } = await admin
      .from("party_members")
      .select("party_id")
      .eq("party_id", partyRecord.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembershipError) {
      return apiError(existingMembershipError.message, 500);
    }

    const { error: joinError } = await admin.from("party_members").upsert(
      {
        party_id: partyRecord.id,
        user_id: user.id,
        user_name: user.name,
      },
      {
        onConflict: "party_id,user_id",
      },
    );

    if (joinError) {
      return apiError(joinError.message, 500);
    }

    return apiSuccess(
      {
        party_id: partyRecord.id,
        user_id: user.id,
        joined: true,
        first_join: !existingMembership,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join party.";
    return apiError(message, 500);
  }
}
