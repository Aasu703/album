"use client";

import { useMemo, useState } from "react";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { Photo } from "@/app/lib/types";
import EmptyState from "@/components/EmptyState";
import Lightbox from "@/components/Lightbox";
import PhotoCard from "@/components/PhotoCard";

interface PhotoGridProps {
  photos: Photo[];
  albumId: string;
  albumName: string;
  newPhotoIds?: string[];
}

interface PhotoItem {
  photo: Photo;
  url: string;
}

/** Reads a filename from Content-Disposition if available. */
function getDownloadFilename(header: string | null, fallback: string) {
  if (!header) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
}

/** Normalizes a filename segment for browser download fallback names. */
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

/** Triggers a browser file download for the provided blob. */
function startBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Renders photo thumbnails, selection controls, and album download actions. */
export default function PhotoGrid({ photos, albumId, albumName, newPhotoIds = [] }: PhotoGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isDownloadingAlbumZip, setIsDownloadingAlbumZip] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const newPhotoIdSet = useMemo(() => new Set(newPhotoIds), [newPhotoIds]);

  const photoItems = useMemo(
    () =>
      photos
        .filter((photo) => Boolean(photo.url))
        .map((photo) => ({
          photo,
          url: isAllowedRemoteImageUrl(photo.url) ? photo.url : null,
        }))
        .filter((item): item is PhotoItem => Boolean(item.url)),
    [photos],
  );

  async function downloadSinglePhoto(photoItem: PhotoItem) {
    if (downloadingPhotoId) {
      return;
    }

    setDownloadError(null);
    setDownloadStatus(null);
    setDownloadingPhotoId(photoItem.photo.id);

    try {
      const rawTitle = photoItem.photo.title?.trim() || "photo";
      const response = await fetch(
        `/api/download?url=${encodeURIComponent(photoItem.url)}&filename=${encodeURIComponent(rawTitle)}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to download this photo.");
      }

      const blob = await response.blob();
      const fallback = `${toSafeFilename(rawTitle, "photo")}.jpg`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);

      startBlobDownload(blob, filename);
      setDownloadStatus("Photo download started.");
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Photo download failed.");
    } finally {
      setDownloadingPhotoId(null);
    }
  }

  async function downloadAlbumArchive() {
    if (photoItems.length === 0) {
      setDownloadError("No photos yet.");
      return;
    }

    setDownloadError(null);
    setDownloadStatus(null);
    setIsDownloadingAlbumZip(true);

    try {
      const response = await fetch("/api/download/album", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoUrls: photoItems.map((item) => item.url),
          albumName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create album ZIP download.");
      }

      const blob = await response.blob();
      const fallback = `${toSafeFilename(albumName, "album")}.zip`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);

      startBlobDownload(blob, filename);

      const warning = response.headers.get("x-download-warning");
      setDownloadStatus(warning ?? "Album ZIP download started.");
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Album ZIP download failed.");
    } finally {
      setIsDownloadingAlbumZip(false);
    }
  }

  return (
    <>
      <section className="space-y-3" data-album-id={albumId}>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E9ECEF] bg-white p-3 shadow-sm">
          <p className="mr-auto text-sm font-semibold text-[#1A1A2E]">{photoItems.length} photos</p>
          <button
            type="button"
            onClick={() => void downloadAlbumArchive()}
            disabled={
              photoItems.length === 0 ||
              isDownloadingAlbumZip ||
              Boolean(downloadingPhotoId)
            }
            title={photoItems.length === 0 ? "No photos yet" : "Download all photos as ZIP"}
            className="min-h-11 rounded-full bg-[#4D96FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloadingAlbumZip ? "Building ZIP..." : "Download All"}
          </button>
        </div>

        {downloadError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {downloadError}
          </p>
        ) : null}

        {downloadStatus ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
            {downloadStatus}
          </p>
        ) : null}
      </section>

      {photoItems.length === 0 ? (
        <EmptyState
          title="No photos yet"
          description="No photos yet. Be the first to upload!"
          emoji="📸"
        />
      ) : (
        <div className="columns-2 gap-3 md:columns-3 xl:columns-4 [column-fill:balance]">
          {photoItems.map((photoItem, index) => {
            const { photo, url } = photoItem;
            const isPhotoDownloading = downloadingPhotoId === photo.id;
            const isNewPhoto = newPhotoIdSet.has(photo.id);

            return (
              <PhotoCard
                key={photo.id}
                photo={{ ...photo, url }}
                isNew={isNewPhoto}
                isDownloading={isPhotoDownloading}
                onOpen={() => setActiveIndex(index)}
                onDownload={() => void downloadSinglePhoto(photoItem)}
              />
            );
          })}
        </div>
      )}

      {activeIndex !== null ? (
        <Lightbox
          photos={photoItems.map((item) => ({ ...item.photo, url: item.url }))}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onChange={setActiveIndex}
        />
      ) : null}
    </>
  );
}
