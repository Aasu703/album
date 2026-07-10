import JSZip from "jszip";
import { NextResponse } from "next/server";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import { apiError } from "@/app/lib/security";
import { MAX_DOWNLOAD_PHOTO_COUNT, MAX_DOWNLOAD_TOTAL_BYTES } from "@/app/lib/validation";

export const runtime = "nodejs";

const DOWNLOAD_TIMEOUT_MS = 15_000;

const MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface AlbumZipBody {
  photoUrls?: unknown;
  albumName?: unknown;
}

/** Returns a conservative filename segment safe for Content-Disposition usage. */
function toSafeFilename(input: string, fallback: string) {
  const normalized = input
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9-_\s]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized || fallback;
}

/** Derives image extension from response headers or URL path. */
function getImageExtension(contentType: string | null, imageUrl: string) {
  const normalizedType = contentType?.toLowerCase() ?? "";

  if (normalizedType.includes("image/jpeg")) return "jpg";
  if (normalizedType.includes("image/png")) return "png";
  if (normalizedType.includes("image/webp")) return "webp";
  if (normalizedType.includes("image/gif")) return "gif";
  if (normalizedType.includes("image/avif")) return "avif";
  if (normalizedType.includes("image/heic")) return "heic";
  if (normalizedType.includes("image/heif")) return "heif";

  try {
    const pathname = new URL(imageUrl).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase() ?? "";

    if (extension in MIME_BY_EXTENSION) {
      return extension;
    }
  } catch {
    // Ignore invalid URL parsing and fall back to jpg.
  }

  return "jpg";
}

/** Builds a ZIP file containing all valid photo URLs and skips failed fetches. */
export async function POST(request: Request) {
  try {
    let body: AlbumZipBody;

    try {
      body = (await request.json()) as AlbumZipBody;
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const rawPhotoUrls = Array.isArray(body.photoUrls) ? body.photoUrls : [];
    const rawAlbumName = typeof body.albumName === "string" ? body.albumName : "album";

    const photoUrls = Array.from(
      new Set(
        rawPhotoUrls
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => isAllowedRemoteImageUrl(value)),
      ),
    );

    if (photoUrls.length === 0) {
      return apiError("No valid photo URLs were provided.", 400);
    }

    if (photoUrls.length > MAX_DOWNLOAD_PHOTO_COUNT) {
      return apiError(
        `Too many photos selected. Maximum ${MAX_DOWNLOAD_PHOTO_COUNT} photos per download.`,
        413,
      );
    }

    const zip = new JSZip();
    let totalBytes = 0;

    const results = await Promise.all(
      photoUrls.map(async (photoUrl, index) => {
        try {
          const response = await fetch(photoUrl, {
            cache: "no-store",
            signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
          });

          if (!response.ok) {
            return { added: false as const };
          }

          const bytes = await response.arrayBuffer();
          totalBytes += bytes.byteLength;

          if (totalBytes > MAX_DOWNLOAD_TOTAL_BYTES) {
            return {
              added: false as const,
              tooLarge: true as const,
            };
          }

          const extension = getImageExtension(response.headers.get("content-type"), photoUrl);
          const filename = `${String(index + 1).padStart(3, "0")}.${extension}`;
          zip.file(filename, bytes);

          return { added: true as const };
        } catch {
          return { added: false as const };
        }
      }),
    );

    if (results.some((result) => "tooLarge" in result && result.tooLarge)) {
      return apiError("Download is too large. Try selecting fewer photos.", 413);
    }

    const addedCount = results.filter((result) => result.added).length;
    const failedCount = photoUrls.length - addedCount;

    if (addedCount === 0) {
      return apiError("Failed to fetch any photos for this archive.", 502);
    }

    const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const albumFilename = toSafeFilename(rawAlbumName, "album");

    const headers = new Headers();
    headers.set("content-type", "application/zip");
    headers.set("cache-control", "no-store");
    headers.set("content-disposition", `attachment; filename="${albumFilename}.zip"`);

    if (failedCount > 0) {
      headers.set("x-download-warning", `${failedCount} photos were skipped because they failed to download.`);
    }

    return new NextResponse(Buffer.from(archive), {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build album archive.";
    return apiError(message, 500);
  }
}