import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { isUuid } from "@/app/lib/validation";

interface UserRouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export const runtime = "nodejs";

/** Deletes a user record while keeping their content in albums/photos tables. */
export async function DELETE(request: Request, context: UserRouteContext) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || !isUuid(id)) {
      return apiError("User id is required and must be valid.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id, name, email")
      .eq("id", id)
      .maybeSingle();

    if (existingUserError) {
      return apiError(existingUserError.message, 500);
    }

    if (!existingUser) {
      return apiError("User not found.", 404);
    }

    const { error: albumsUpdateError } = await admin
      .from("albums")
      .update({ created_by: null })
      .eq("created_by", id);

    if (albumsUpdateError) {
      return apiError(albumsUpdateError.message, 500);
    }

    const { error: photosUpdateError } = await admin
      .from("photos")
      .update({ uploaded_by: null })
      .eq("uploaded_by", id);

    if (photosUpdateError) {
      return apiError(photosUpdateError.message, 500);
    }

    const { error: partyMembersDeleteError } = await admin
      .from("party_members")
      .delete()
      .eq("user_id", id);

    if (partyMembersDeleteError) {
      return apiError(partyMembersDeleteError.message, 500);
    }

    const { error: deleteError } = await admin.from("users").delete().eq("id", id);
    if (deleteError) {
      return apiError(deleteError.message, 500);
    }

    return apiSuccess(
      {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return apiError(message, 500);
  }
}