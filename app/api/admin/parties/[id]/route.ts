import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { isUuid } from "@/app/lib/validation";

interface PartyRouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export const runtime = "nodejs";

/** Deactivates a party by setting is_active to false. */
export async function PATCH(request: Request, context: PartyRouteContext) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || !isUuid(id)) {
      return apiError("Party id is required and must be valid.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("parties")
      .update({ is_active: false })
      .eq("id", id)
      .select("id, is_active")
      .maybeSingle();

    if (error) {
      return apiError(error.message, 500);
    }

    if (!data) {
      return apiError("Party not found.", 404);
    }

    return apiSuccess(data, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to deactivate party.";
    return apiError(message, 500);
  }
}

/** Deletes a party and all of its party_members records. */
export async function DELETE(request: Request, context: PartyRouteContext) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || !isUuid(id)) {
      return apiError("Party id is required and must be valid.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: existing, error: existingError } = await admin
      .from("parties")
      .select("id, name, album_id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return apiError(existingError.message, 500);
    }

    if (!existing) {
      return apiError("Party not found.", 404);
    }

    const { error: membersDeleteError } = await admin
      .from("party_members")
      .delete()
      .eq("party_id", id);

    if (membersDeleteError) {
      return apiError(membersDeleteError.message, 500);
    }

    const { error: partyDeleteError } = await admin.from("parties").delete().eq("id", id);
    if (partyDeleteError) {
      return apiError(partyDeleteError.message, 500);
    }

    return apiSuccess(existing, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete party.";
    return apiError(message, 500);
  }
}