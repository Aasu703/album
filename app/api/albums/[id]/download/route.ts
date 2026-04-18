import JSZip from "jszip";
import { NextResponse } from "next/server";

import { supabase } from "@/app/lib/supabase";
import type { Photo } from "@/app/lib/types";

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

  return ids.length > 0 ? ids : null;
}

/** Builds a ZIP file for all or selected photos in the target album. */
export async function GET(request: Request, context: DownloadContext) {
  const { id: albumId } = await Promise.resolve(context.params);

  if (!albumId) {
    return NextResponse.json({ data: null, error: "Album id is required." }, { status: 400 });
  }

  const requestedPhotoIds = getRequestedPhotoIds(request);

  const [{ data: album, error: albumError }, { data: photos, error: photosError }] =
    await Promise.all([
      supabase.from("albums").select("id, name").eq("id", albumId).single(),
      supabase
        .from("photos")
        .select("id, album_id, url, title, created_at")
        .eq("album_id", albumId)
        .order("created_at", { ascending: true }),
    ]);

  if (albumError || !album) {
    return NextResponse.json({ data: null, error: "Album not found." }, { status: 404 });
  }

  if (photosError) {
    return NextResponse.json({ data: null, error: photosError.message }, { status: 500 });
  }

  const albumPhotos = (photos ?? []) as Photo[];
  const filteredPhotos = requestedPhotoIds
    ? albumPhotos.filter((photo) => requestedPhotoIds.includes(photo.id))
    : albumPhotos;

  if (filteredPhotos.length === 0) {
    return NextResponse.json(
      { data: null, error: "No photos found for download." },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const failedIds: string[] = [];

  await Promise.all(
    filteredPhotos.map(async (photo, index) => {
      try {
        const response = await fetch(photo.url, { cache: "no-store" });
        if (!response.ok) {
          failedIds.push(photo.id);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const extension = getFileExtension(response.headers.get("content-type"), photo.url);
        const titlePart = toSafeFilename(photo.title ?? "", `photo-${index + 1}`);

        zip.file(`${String(index + 1).padStart(3, "0")}-${titlePart}.${extension}`, arrayBuffer);
      } catch {
        failedIds.push(photo.id);
      }
    }),
  );

  if (Object.keys(zip.files).length === 0) {
    return NextResponse.json(
      { data: null, error: "Failed to fetch image files for this album." },
      { status: 502 },
    );
  }

  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const albumName = toSafeFilename(album.name ?? "album", "album");
  const suffix = requestedPhotoIds ? "selected" : "all";

  const headers = new Headers();
  headers.set("content-type", "application/zip");
  headers.set("content-disposition", `attachment; filename="${albumName}-${suffix}.zip"`);

  if (failedIds.length > 0) {
    headers.set("x-download-warning", `${failedIds.length} images could not be added to the archive.`);
  }

  return new NextResponse(Buffer.from(archive), { status: 200, headers });
}
