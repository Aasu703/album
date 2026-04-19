import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { validateOptionalEmail, validateUserName } from "@/app/lib/validation";
import { generateAvatarColor } from "@/lib/avatar";
import { getSession } from "@/lib/session";

interface LoginBody {
  name?: unknown;
  email?: unknown;
  guestId?: unknown;
}

const GUEST_EMAIL_DOMAIN = "guest.local";

/** Sanitizes a guest id input into a stable lowercase token. */
function sanitizeGuestId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const safe = normalized.replace(/[^a-z0-9-]/g, "");
  return safe.length >= 8 ? safe : null;
}

/** Converts guest id into a synthetic email usable for deterministic identity rows. */
function toGuestEmail(guestId: string) {
  return `guest+${guestId}@${GUEST_EMAIL_DOMAIN}`;
}

/** Resolves user by email, creating or updating display name as needed. */
async function resolveUser(name: string, email: string) {
  const admin = getSupabaseAdmin();

  const { data: existingUser, error: existingUserError } = await admin
    .from("users")
    .select("id, name, email")
    .eq("email", email)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(existingUserError.message);
  }

  if (existingUser) {
    const resolvedUser = existingUser as { id: string; name: string; email: string };

    if (resolvedUser.name === name) {
      return resolvedUser;
    }

    const { data: updatedUser, error: updateError } = await admin
      .from("users")
      .update({ name })
      .eq("id", resolvedUser.id)
      .select("id, name, email")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedUser as { id: string; name: string; email: string };
  }

  const { data: createdUser, error: createError } = await admin
    .from("users")
    .insert({ name, email })
    .select("id, name, email")
    .single();

  if (createError) {
    const duplicate = createError.code === "23505" || /duplicate key/i.test(createError.message);

    if (!duplicate) {
      throw new Error(createError.message);
    }

    const { data: racedUser, error: racedUserError } = await admin
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .maybeSingle();

    if (racedUserError || !racedUser) {
      throw new Error(racedUserError?.message ?? "Failed to restore identity.");
    }

    return racedUser as { id: string; name: string; email: string };
  }

  return createdUser as { id: string; name: string; email: string };
}

export const runtime = "nodejs";

/** Creates or restores a user identity and persists it in encrypted session cookie. */
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

    const { value: email, error: emailError } = validateOptionalEmail(body.email);
    if (emailError) {
      return apiError(emailError, 400);
    }

    const providedGuestId = sanitizeGuestId(body.guestId);

    let guestId: string | null = null;
    let identityEmail = email;

    if (!identityEmail) {
      guestId = providedGuestId ?? randomUUID();
      identityEmail = toGuestEmail(guestId);
    }

    const isGuest = !email;

    if (!identityEmail) {
      return apiError("Failed to establish identity email.", 500);
    }

    const resolvedUser = await resolveUser(name, identityEmail);

    const avatarColor = generateAvatarColor(isGuest ? `guest:${guestId}` : resolvedUser.email);
    const session = await getSession();

    session.userId = resolvedUser.id;
    session.userName = resolvedUser.name;
    session.userEmail = isGuest ? null : resolvedUser.email;
    session.avatarColor = avatarColor;
    session.isGuest = isGuest;
    session.guestId = guestId;
    await session.save();

    return NextResponse.json(
      {
        success: true,
        user: {
          id: resolvedUser.id,
          name: resolvedUser.name,
          email: isGuest ? null : resolvedUser.email,
          avatarColor,
          isGuest,
          guestId,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login.";
    return apiError(message, 500);
  }
}
