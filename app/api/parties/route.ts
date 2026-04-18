import { randomBytes } from "node:crypto";

import { apiError, apiSuccess, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { PartyWithJoinUrl } from "@/app/lib/types";
import {
  isUuid,
  validateOptionalPartyDescription,
  validatePartyName,
  validateUserName,
} from "@/app/lib/validation";

interface CreatePartyBody {
  name?: string;
  description?: string;
  host_id?: string;
  host_name?: string;
}

const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_JOIN_CODE_RETRIES = 5;

export const runtime = "nodejs";

/** Generates a cryptographically random uppercase alphanumeric join code. */
function generateJoinCode() {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let code = "";

  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    const charIndex = bytes[index] % JOIN_CODE_ALPHABET.length;
    code += JOIN_CODE_ALPHABET[charIndex];
  }

  return code;
}

/** Builds a canonical app URL for join links. */
function getAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

/** Finds a unique join code with bounded retries. */
async function generateUniqueJoinCode() {
  const admin = getSupabaseAdmin();

  for (let attempt = 0; attempt < MAX_JOIN_CODE_RETRIES; attempt += 1) {
    const candidate = generateJoinCode();

    const { data, error } = await admin
      .from("parties")
      .select("id")
      .eq("join_code", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  return null;
}

/** Creates a party with a dedicated shared album and unique join code. */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return apiError("Request origin is not allowed.", 403);
  }

  try {
    let body: CreatePartyBody;

    try {
      body = (await request.json()) as CreatePartyBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const { value: name, error: nameError } = validatePartyName(body.name);
    if (nameError || !name) {
      return apiError(nameError ?? "Party name is required.", 400);
    }

    const { value: description, error: descriptionError } = validateOptionalPartyDescription(
      body.description,
    );
    if (descriptionError) {
      return apiError(descriptionError, 400);
    }

    const hostId = body.host_id?.trim();
    if (!hostId || !isUuid(hostId)) {
      return apiError("host_id must be a valid identifier.", 400);
    }

    const { value: hostName, error: hostNameError } = validateUserName(body.host_name);
    if (hostNameError || !hostName) {
      return apiError(hostNameError ?? "host_name is required.", 400);
    }

    const admin = getSupabaseAdmin();

    const { data: host, error: hostError } = await admin
      .from("users")
      .select("id, name")
      .eq("id", hostId)
      .maybeSingle();

    if (hostError) {
      return apiError(hostError.message, 500);
    }

    if (!host) {
      return apiError("Host identity not found.", 404);
    }

    const joinCode = await generateUniqueJoinCode();

    if (!joinCode) {
      return apiError("Failed to generate a unique join code. Please try again.", 503);
    }

    const { data: album, error: albumError } = await admin
      .from("albums")
      .insert({
        name: `${name} Shared Album`,
        cover_url: null,
        created_by: host.id,
      })
      .select("id")
      .single();

    if (albumError || !album) {
      return apiError(albumError?.message ?? "Failed to create party album.", 500);
    }

    const { data: party, error: partyError } = await admin
      .from("parties")
      .insert({
        name,
        description,
        host_id: host.id,
        host_name: host.name,
        join_code: joinCode,
        album_id: album.id,
        is_active: true,
      })
      .select("id, name, description, host_id, host_name, join_code, album_id, is_active, created_at, expires_at")
      .single();

    if (partyError || !party) {
      await admin.from("albums").delete().eq("id", album.id);
      return apiError(partyError?.message ?? "Failed to create party.", 500);
    }

    const joinUrl = `${getAppUrl(request)}/join/${joinCode}`;

    return apiSuccess(
      {
        ...(party as PartyWithJoinUrl),
        join_url: joinUrl,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create party.";
    return apiError(message, 500);
  }
}
