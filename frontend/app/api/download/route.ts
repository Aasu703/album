import { NextResponse } from "next/server";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import { apiError } from "@/app/lib/security";

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

/** Streams a Cloudinary image through the server with attachment headers to force download. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url")?.trim() ?? "";
    const filenameInput = searchParams.get("filename")?.trim() ?? "photo";

    if (!targetUrl || !isAllowedRemoteImageUrl(targetUrl)) {
      return apiError("A valid Cloudinary image URL is required.", 400);
    }

    const imageResponse = await fetch(targetUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!imageResponse.ok) {
      return apiError("Failed to fetch image from Cloudinary.", 502);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const extension = getImageExtension(imageResponse.headers.get("content-type"), targetUrl);
    const mimeType = MIME_BY_EXTENSION[extension] ?? "image/jpeg";
    const safeFilename = toSafeFilename(filenameInput, "photo");

    const headers = new Headers();
    headers.set("content-type", mimeType);
    headers.set("cache-control", "no-store");
    headers.set("content-disposition", `attachment; filename="${safeFilename}.${extension}"`);

    return new NextResponse(Buffer.from(arrayBuffer), { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to download image.";
    return apiError(message, 500);
  }
}