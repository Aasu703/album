import {
  cloudinary,
  extractPublicId,
  hasCloudinaryCredentials,
} from "@/app/lib/cloudinary";
import { apiError, apiSuccess, getClientIp, isTrustedOrigin } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import { supabase } from "@/app/lib/supabase";
import type { Photo } from "@/app/lib/types";
import {
  isUuid,
  validateJoinCode,
  validateOptionalPhotoTitle,
} from "@/app/lib/validation";
import { generateAvatarColor } from "@/lib/avatar";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 20;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOAD_BUCKETS = 10_000;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const uploadBuckets = new Map<string, { count: number; resetAt: number }>();

/** Clears expired upload buckets when the in-memory map grows too large. */
function pruneUploadBuckets(now: number) {
  if (uploadBuckets.size < MAX_UPLOAD_BUCKETS) {
    return;
  }

  for (const [key, bucket] of uploadBuckets) {
    if (now > bucket.resetAt) {
      uploadBuckets.delete(key);
    }
  }
}

/** Checks per-IP upload quota (20 uploads per hour). */
function checkUploadRateLimit(ip: string) {
  const now = Date.now();
  pruneUploadBuckets(now);

  const key = `upload:${ip}`;
  const current = uploadBuckets.get(key);

  if (!current || now > current.resetAt) {
    const resetAt = now + UPLOAD_RATE_LIMIT_WINDOW_MS;
    uploadBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: UPLOAD_RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    };
  }

  if (current.count >= UPLOAD_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  uploadBuckets.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(UPLOAD_RATE_LIMIT_MAX_REQUESTS - current.count, 0),
    resetAt: current.resetAt,
  };
}

/** Deletes a Cloudinary image by URL when metadata persistence fails. */
async function cleanupUploadedAsset(uploadedUrl: string | null) {
  if (!uploadedUrl || !hasCloudinaryCredentials) {
    return;
  }

  const publicId = extractPublicId(uploadedUrl);
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup only.
  }
}

/** Uploads image bytes to Cloudinary and returns its secure URL. */
async function uploadToCloudinary(file: File): Promise<string> {
  if (!hasCloudinaryCredentials) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable uploads.",
    );
  }
                                           
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "personal-album",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(new Error(error?.message ?? "Cloudinary upload failed."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

/** Handles image upload, then stores metadata in Supabase photos table. */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("Request origin is not allowed.", 403);
    }

    const ip = getClientIp(request);
    const uploadRate = checkUploadRateLimit(ip);

    if (!uploadRate.allowed) {
      const retryAfterSeconds = Math.max(
        Math.ceil((uploadRate.resetAt - Date.now()) / 1000),
        1,
      );

      const rateLimitResponse = apiError(
        "Upload limit reached for this hour. Please try again later.",
        429,
      );
      rateLimitResponse.headers.set("Retry-After", String(retryAfterSeconds));
      rateLimitResponse.headers.set("X-RateLimit-Limit", String(UPLOAD_RATE_LIMIT_MAX_REQUESTS));
      rateLimitResponse.headers.set("X-RateLimit-Remaining", "0");
      rateLimitResponse.headers.set("X-RateLimit-Reset", String(Math.floor(uploadRate.resetAt / 1000)));

      return rateLimitResponse;
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return apiError("Invalid form data payload.", 400);
    }

    const inputAlbumId = String(formData.get("album_id") ?? "").trim();
    const inputPartyCode = String(formData.get("party_join_code") ?? "").trim();
    const { value: title, error: titleError } = validateOptionalPhotoTitle(formData.get("title"));
    const file = formData.get("file");

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return apiError("Unauthorized.", 401);
    }

    if (titleError) {
      return apiError(titleError, 400);
    }

    if (!(file instanceof File) || file.size === 0) {
      return apiError("A valid image file is required.", 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return apiError("Unsupported file type. Please upload JPEG, PNG, WEBP, or HEIC.", 400);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return apiError("File too large. Maximum allowed size is 10MB.", 413);
    }

    const admin = getSupabaseAdmin();

    const { data: uploader, error: uploaderError } = await admin
      .from("users")
      .select("id, name, email")
      .eq("id", sessionUser.userId)
      .maybeSingle();

    if (uploaderError) {
      return apiError(uploaderError.message, 500);
    }

    if (!uploader) {
      return apiError("Uploader identity not found.", 404);
    }

    let albumId = inputAlbumId;

    if (inputPartyCode) {
      const { value: partyCode, error: partyCodeError } = validateJoinCode(inputPartyCode);
      if (partyCodeError || !partyCode) {
        return apiError(partyCodeError ?? "Invalid party join code.", 400);
      }

      const { data: party, error: partyError } = await admin
        .from("parties")
        .select("album_id, is_active, expires_at")
        .eq("join_code", partyCode)
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

      albumId = party.album_id;
    }

    if (!albumId || !isUuid(albumId)) {
      return apiError("album_id must be a valid identifier.", 400);
    }

    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .maybeSingle();

    if (albumError) {
      return apiError(albumError.message, 500);
    }

    if (!album) {
      return apiError("Album not found.", 404);
    }

    let uploadedUrl: string | null = null;

    try {
      uploadedUrl = await uploadToCloudinary(file);

      const { data, error } = await supabase
        .from("photos")
        .insert({
          album_id: albumId,
          url: uploadedUrl,
          title,
          uploaded_by: sessionUser.userId,
          uploaded_by_name: uploader.name,
        })
        .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
        .single();

      if (error) {
        await cleanupUploadedAsset(uploadedUrl);
        return apiError(error.message, 500);
      }

      let warning: string | null = null;

      const { count, error: countError } = await supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("album_id", albumId);

      if (!countError && count === 1) {
        const { error: coverError } = await supabase
          .from("albums")
          .update({ cover_url: uploadedUrl })
          .eq("id", albumId)
          .is("cover_url", null);

        if (coverError) {
          warning = "Photo uploaded, but album cover could not be updated automatically.";
        }
      } else if (countError) {
        warning = "Photo uploaded, but album cover status could not be refreshed.";
      }

      const response = apiSuccess(
        {
          ...(data as Photo),
          uploaded_by_avatar_color: generateAvatarColor(
            typeof uploader.email === "string" && uploader.email.length > 0
              ? uploader.email
              : sessionUser.userEmail,
          ),
        } satisfies Photo,
        201,
        {
        success: true,
        url: uploadedUrl,
        warning,
      });

      response.headers.set("X-RateLimit-Limit", String(UPLOAD_RATE_LIMIT_MAX_REQUESTS));
      response.headers.set("X-RateLimit-Remaining", String(uploadRate.remaining));
      response.headers.set("X-RateLimit-Reset", String(Math.floor(uploadRate.resetAt / 1000)));

      if (warning) {
        response.headers.set("x-upload-warning", warning);
      }

      return response;
    } catch (error) {
      await cleanupUploadedAsset(uploadedUrl ?? null);

      const message = error instanceof Error ? error.message : "Upload failed.";
      return apiError(message, 500);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process upload.";
    return apiError(message, 500);
  }
}
