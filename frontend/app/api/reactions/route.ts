import { NextResponse } from "next/server";

import { apiError, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { ReactionEmoji, ReactionSummary } from "@/app/lib/types";
import { isUuid } from "@/app/lib/validation";
import { getSessionUser } from "@/lib/session";

const ALLOWED_EMOJIS: ReactionEmoji[] = ["❤️", "😂", "🔥", "😮", "👏"];

interface ReactionsBody {
  photo_id?: unknown;
  emoji?: unknown;
}

/** Returns true when emoji is part of the supported reactions set. */
function isReactionEmoji(value: string): value is ReactionEmoji {
  return ALLOWED_EMOJIS.includes(value as ReactionEmoji);
}

/** Builds a zeroed reaction summary object for consistent API responses. */
function createEmptySummary(): ReactionSummary {
  return {
    "❤️": { count: 0, reacted: false, users: [] },
    "😂": { count: 0, reacted: false, users: [] },
    "🔥": { count: 0, reacted: false, users: [] },
    "😮": { count: 0, reacted: false, users: [] },
    "👏": { count: 0, reacted: false, users: [] },
  };
}

/** Loads all reactions for a photo and groups them by emoji including reacted state. */
async function loadReactionSummary(photoId: string, currentUserId: string | null) {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("reactions")
    .select("photo_id, user_id, user_name, emoji")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const summary = createEmptySummary();
  const rows = (data ?? []) as Array<{
    photo_id: string;
    user_id: string;
    user_name: string;
    emoji: string;
  }>;

  for (const row of rows) {
    if (!isReactionEmoji(row.emoji)) {
      continue;
    }

    const bucket = summary[row.emoji];
    bucket.count += 1;
    bucket.users.push(row.user_name);

    if (currentUserId && row.user_id === currentUserId) {
      bucket.reacted = true;
    }
  }

  return summary;
}

/** Validates JSON body for POST/DELETE reactions mutation endpoints. */
function validateBody(body: ReactionsBody) {
  const photoId = typeof body.photo_id === "string" ? body.photo_id.trim() : "";
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";

  if (!photoId || !isUuid(photoId)) {
    return { photoId: null, emoji: null, error: "photo_id must be a valid identifier." };
  }

  if (!emoji || !isReactionEmoji(emoji)) {
    return { photoId: null, emoji: null, error: "emoji must be one of ❤️ 😂 🔥 😮 👏." };
  }

  return { photoId, emoji, error: null };
}

/** Returns grouped reactions for a photo id. */
export async function GET(request: Request) {
  try {
    const photoId = new URL(request.url).searchParams.get("photo_id")?.trim() ?? "";

    if (!photoId || !isUuid(photoId)) {
      return apiError("photo_id query parameter is required and must be valid.", 400);
    }

    const sessionUser = await getSessionUser(request);
    const summary = await loadReactionSummary(photoId, sessionUser?.userId ?? null);

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reactions.";
    return apiError(message, 500);
  }
}

/** Adds a reaction for the current cookie session user and returns updated summary. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return apiError("Unauthorized.", 401);
    }

    let body: ReactionsBody;

    try {
      body = (await request.json()) as ReactionsBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const { photoId, emoji, error } = validateBody(body);
    if (error || !photoId || !emoji) {
      return apiError(error ?? "Invalid request body.", 400);
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

    const { error: insertError } = await admin.from("reactions").upsert(
      {
        photo_id: photoId,
        user_id: user.id,
        user_name: user.name,
        emoji,
      },
      {
        onConflict: "photo_id,user_id,emoji",
        ignoreDuplicates: true,
      },
    );

    if (insertError) {
      return apiError(insertError.message, 500);
    }

    const summary = await loadReactionSummary(photoId, sessionUser.userId);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add reaction.";
    return apiError(message, 500);
  }
}

/** Removes a reaction for the current cookie session user and returns updated summary. */
export async function DELETE(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return apiError("Unauthorized.", 401);
    }

    let body: ReactionsBody;

    try {
      body = (await request.json()) as ReactionsBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const { photoId, emoji, error } = validateBody(body);
    if (error || !photoId || !emoji) {
      return apiError(error ?? "Invalid request body.", 400);
    }

    const admin = getSupabaseAdmin();

    const { error: deleteError } = await admin
      .from("reactions")
      .delete()
      .eq("photo_id", photoId)
      .eq("user_id", sessionUser.userId)
      .eq("emoji", emoji);

    if (deleteError) {
      return apiError(deleteError.message, 500);
    }

    const summary = await loadReactionSummary(photoId, sessionUser.userId);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove reaction.";
    return apiError(message, 500);
  }
}
