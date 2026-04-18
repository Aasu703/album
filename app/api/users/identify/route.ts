import { apiError, apiSuccess, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { UserIdentity } from "@/app/lib/types";
import { validateEmail, validateUserName } from "@/app/lib/validation";

interface IdentifyBody {
  name?: string;
  email?: string;
}

/** Restores existing user by email or creates a new identity record. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    let body: IdentifyBody;

    try {
      body = (await request.json()) as IdentifyBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const { value: name, error: nameError } = validateUserName(body.name);
    if (nameError || !name) {
      return apiError(nameError ?? "Name is required.", 400);
    }

    const { value: email, error: emailError } = validateEmail(body.email);
    if (emailError || !email) {
      return apiError(emailError ?? "Email is required.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) {
      return apiError(existingUserError.message, 500);
    }

    if (existingUser) {
      if (existingUser.name !== name) {
        const { data: updatedUser, error: updateError } = await admin
          .from("users")
          .update({ name })
          .eq("id", existingUser.id)
          .select("id, name, email")
          .single();

        if (updateError) {
          return apiError(updateError.message, 500);
        }

        return apiSuccess(updatedUser as UserIdentity, 200);
      }

      return apiSuccess(existingUser as UserIdentity, 200);
    }

    const { data: createdUser, error: createError } = await admin
      .from("users")
      .insert({ name, email })
      .select("id, name, email")
      .single();

    if (createError) {
      const duplicate = createError.code === "23505" || /duplicate key/i.test(createError.message);
      if (duplicate) {
        const { data: racedUser, error: racedUserError } = await admin
          .from("users")
          .select("id, name, email")
          .eq("email", email)
          .maybeSingle();

        if (racedUserError || !racedUser) {
          return apiError(racedUserError?.message ?? "Failed to restore identity.", 500);
        }

        return apiSuccess(racedUser as UserIdentity, 200);
      }

      return apiError(createError.message, 500);
    }

    return apiSuccess(createdUser as UserIdentity, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to establish identity.";
    return apiError(message, 500);
  }
}
