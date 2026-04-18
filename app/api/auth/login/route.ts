import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { validateEmail, validateUserName } from "@/app/lib/validation";
import { generateAvatarColor } from "@/lib/avatar";
import { getSession } from "@/lib/session";

interface LoginBody {
  name?: unknown;
  email?: unknown;
}

export const runtime = "nodejs";

/** Creates or restores a user by email and persists identity in encrypted session cookie. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    let body: LoginBody;

    try {
      body = (await request.json()) as LoginBody;
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

    let resolvedUser: { id: string; name: string; email: string };

    if (existingUser) {
      resolvedUser = existingUser as { id: string; name: string; email: string };

      if (resolvedUser.name !== name) {
        const { data: updatedUser, error: updateError } = await admin
          .from("users")
          .update({ name })
          .eq("id", resolvedUser.id)
          .select("id, name, email")
          .single();

        if (updateError) {
          return apiError(updateError.message, 500);
        }

        resolvedUser = updatedUser as { id: string; name: string; email: string };
      }
    } else {
      const { data: createdUser, error: createError } = await admin
        .from("users")
        .insert({ name, email })
        .select("id, name, email")
        .single();

      if (createError) {
        const duplicate = createError.code === "23505" || /duplicate key/i.test(createError.message);

        if (!duplicate) {
          return apiError(createError.message, 500);
        }

        const { data: racedUser, error: racedUserError } = await admin
          .from("users")
          .select("id, name, email")
          .eq("email", email)
          .maybeSingle();

        if (racedUserError || !racedUser) {
          return apiError(racedUserError?.message ?? "Failed to restore identity.", 500);
        }

        resolvedUser = racedUser as { id: string; name: string; email: string };
      } else {
        resolvedUser = createdUser as { id: string; name: string; email: string };
      }
    }

    const avatarColor = generateAvatarColor(resolvedUser.email);
    const session = await getSession();

    session.userId = resolvedUser.id;
    session.userName = resolvedUser.name;
    session.userEmail = resolvedUser.email;
    session.avatarColor = avatarColor;
    await session.save();

    return NextResponse.json(
      {
        success: true,
        user: {
          id: resolvedUser.id,
          name: resolvedUser.name,
          email: resolvedUser.email,
          avatarColor,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login.";
    return apiError(message, 500);
  }
}
