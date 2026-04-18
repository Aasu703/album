import JSZip from "jszip";
import { NextResponse } from "next/server";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import { apiError } from "@/app/lib/security";
import { supabase } from "@/app/lib/supabase";
import type { Photo } from "@/app/lib/types";
import {
  isUuid,
  MAX_DOWNLOAD_PHOTO_COUNT,
  MAX_DOWNLOAD_TOTAL_BYTES,
} from "@/app/lib/validation";

export const runtime = "nodejs";

const DOWNLOAD_FETCH_TIMEOUT_MS = 15_000;

interface DownloadContext {
  params: { id: string } | Promise<{ id: string }>;
}

/** Returns a filesystem-safe filename segment. */
function toSafeFilename(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
}

/** Guesses a file extension from response headers or URL path. */
function getFileExtension(contentType: string | null, imageUrl: string) {
  if (contentType?.includes("image/jpeg")) return "jpg";
  if (contentType?.includes("image/png")) return "png";
  if (contentType?.includes("image/webp")) return "webp";
  if (contentType?.includes("image/gif")) return "gif";
  if (contentType?.includes("image/avif")) return "avif";

  try {
    const pathname = new URL(imageUrl).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();
    if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
      return extension;
    }
  } catch {
    // Ignore URL parsing issues and use default extension.
  }

  return "jpg";
}

/** Parses optional CSV photo id filter from query params. */
function getRequestedPhotoIds(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawIds = searchParams.get("photo_ids")?.trim();

  if (!rawIds) {
    return null;
  }

  const ids = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return null;
  }

  return Array.from(new Set(ids));
}

/** Builds a ZIP file for all or selected photos in the target album. */
export async function GET(request: Request, context: DownloadContext) {
  try {
    const { id: albumId } = await Promise.resolve(context.params);

    if (!albumId || !isUuid(albumId)) {
      return apiError("Album id is required and must be valid.", 400);
    }

    const requestedPhotoIds = getRequestedPhotoIds(request);

    if (requestedPhotoIds && requestedPhotoIds.length > MAX_DOWNLOAD_PHOTO_COUNT) {
      return apiError(
        `Too many selected photos. Maximum ${MAX_DOWNLOAD_PHOTO_COUNT} photos per download.`,
        400,
      );
    }

    const [{ data: album, error: albumError }, { data: photos, error: photosError }] =
      await Promise.all([
        supabase.from("albums").select("id, name").eq("id", albumId).maybeSingle(),
        supabase
          .from("photos")
          .select("id, album_id, url, title, uploaded_by, uploaded_by_name, created_at")
          .eq("album_id", albumId)
          .order("created_at", { ascending: true }),
      ]);

    if (albumError || !album) {
      return apiError("Album not found.", 404);
    }

    if (photosError) {
      return apiError(photosError.message, 500);
    }

    const albumPhotos = (photos ?? []) as Photo[];
    const filteredPhotos = requestedPhotoIds
      ? albumPhotos.filter((photo) => requestedPhotoIds.includes(photo.id))
      : albumPhotos;

    const downloadablePhotos = filteredPhotos.filter((photo) => isAllowedRemoteImageUrl(photo.url));

    if (downloadablePhotos.length === 0) {
      return apiError("No eligible photos found for download.", 404);
    }

    if (downloadablePhotos.length > MAX_DOWNLOAD_PHOTO_COUNT) {
      return apiError(
        `Album is too large to download in one request. Maximum ${MAX_DOWNLOAD_PHOTO_COUNT} photos are allowed.`,
        413,
      );
    }

    const zip = new JSZip();
    const failedIds: string[] = [];
    let totalBytes = 0;

    for (const [index, photo] of downloadablePhotos.entries()) {
      try {
        const response = await fetch(photo.url, {
          cache: "no-store",
          signal: AbortSignal.timeout(DOWNLOAD_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
          failedIds.push(photo.id);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        totalBytes += arrayBuffer.byteLength;

        if (totalBytes > MAX_DOWNLOAD_TOTAL_BYTES) {
          return apiError("Download is too large. Try selecting fewer photos.", 413);
        }

        const extension = getFileExtension(response.headers.get("content-type"), photo.url);
        const titlePart = toSafeFilename(photo.title ?? "", `photo-${index + 1}`);

        zip.file(`${String(index + 1).padStart(3, "0")}-${titlePart}.${extension}`, arrayBuffer);
      } catch {
        failedIds.push(photo.id);
      }
    }

    if (Object.keys(zip.files).length === 0) {
      return apiError("Failed to fetch image files for this album.", 502);
    }

    const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const albumName = toSafeFilename(album.name ?? "album", "album");
    const suffix = requestedPhotoIds ? "selected" : "all";

    const headers = new Headers();
    headers.set("content-type", "application/zip");
    headers.set("cache-control", "no-store");
    headers.set("content-disposition", `attachment; filename="${albumName}-${suffix}.zip"`);

    if (failedIds.length > 0) {
      headers.set("x-download-warning", `${failedIds.length} images could not be added to the archive.`);
    }

    return new NextResponse(Buffer.from(archive), { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build download archive.";
    return apiError(message, 500);
  }
}
