"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { Photo } from "@/app/lib/types";

interface PhotoGridProps {
  photos: Photo[];
  albumId: string;
  albumName: string;
}

interface PhotoItem {
  photo: Photo;
  url: string;
}

interface ActivePhoto extends Photo {
  url: string;
}

/** Renders a compact download icon for action buttons. */
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
export default function PhotoGrid({ photos, albumId, albumName }: PhotoGridProps) {
  const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isDownloadingAlbumZip, setIsDownloadingAlbumZip] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);

  const photoItems = useMemo(
    () =>
      photos
        .map((photo) => ({
          photo,
          url: isAllowedRemoteImageUrl(photo.url) ? photo.url : null,
        }))
        .filter((item): item is PhotoItem => Boolean(item.url)),
    [photos],
  );

  const visiblePhotoIds = useMemo(() => photoItems.map(({ photo }) => photo.id), [photoItems]);

  const selectedCount = selectedPhotoIds.length;

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId],
    );
  }

  function selectAllVisible() {
    setSelectedPhotoIds(visiblePhotoIds);
  }

  function clearSelection() {
    setSelectedPhotoIds([]);
  }

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

  async function downloadSelectedArchive() {
    if (selectedPhotoIds.length === 0) {
      setDownloadError("Select at least one photo to download selected images.");
      return;
    }

    setDownloadError(null);
    setDownloadStatus(null);
    setIsDownloadingSelected(true);

    try {
      const response = await fetch(
        `/api/albums/${albumId}/download?photo_ids=${encodeURIComponent(selectedPhotoIds.join(","))}`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create selected download archive.");
      }

      const blob = await response.blob();
      const fallback = `${toSafeFilename(albumName, "album")}-selected.zip`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);

      startBlobDownload(blob, filename);

      const warning = response.headers.get("x-download-warning");
      setDownloadStatus(warning ?? "Selected photos download started.");
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setIsDownloadingSelected(false);
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
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <p className="mr-auto text-sm text-gray-700 dark:text-gray-300">
            {selectedCount > 0
              ? `${selectedCount} selected of ${photoItems.length}`
              : `${photoItems.length} photos`}
          </p>
          <button
            type="button"
            onClick={selectAllVisible}
            className="min-h-10 rounded-full bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-300"
            disabled={photoItems.length === 0}
            title={photoItems.length === 0 ? "No photos yet" : "Select all visible photos"}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="min-h-10 rounded-full bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={selectedCount === 0}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void downloadSelectedArchive()}
            disabled={selectedCount === 0 || isDownloadingSelected || isDownloadingAlbumZip || Boolean(downloadingPhotoId)}
            className="min-h-10 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloadingSelected ? "Preparing selected..." : "Download selected"}
          </button>
          <button
            type="button"
            onClick={() => void downloadAlbumArchive()}
            disabled={
              photoItems.length === 0 ||
              isDownloadingAlbumZip ||
              isDownloadingSelected ||
              Boolean(downloadingPhotoId)
            }
            title={photoItems.length === 0 ? "No photos yet" : "Download all photos as ZIP"}
            className="min-h-10 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          No photos yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photoItems.map((photoItem) => {
            const { photo, url } = photoItem;
            const checked = selectedPhotoIds.includes(photo.id);
            const isPhotoDownloading = downloadingPhotoId === photo.id;

            return (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
              >
                <button
                  type="button"
                  onClick={() => setActivePhoto({ ...photo, url })}
                  className="h-full w-full"
                >
                  <Image
                    src={url}
                    alt={photo.title ?? "Album photo"}
                    width={300}
                    height={300}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    quality={75}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                </button>
                <label className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-full bg-black/65 px-2 py-1 text-[11px] text-white">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePhotoSelection(photo.id)}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  Select
                </label>
                <button
                  type="button"
                  onClick={() => void downloadSinglePhoto(photoItem)}
                  disabled={
                    isPhotoDownloading ||
                    isDownloadingSelected ||
                    isDownloadingAlbumZip ||
                    Boolean(downloadingPhotoId)
                  }
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Download photo"
                  aria-label="Download photo"
                >
                  {isPhotoDownloading ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <DownloadIcon />
                  )}
                </button>
                {photo.uploaded_by_name ? (
                  <p className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[11px] text-white">
                    By {photo.uploaded_by_name}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {activePhoto ? (
        <div
          role="presentation"
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-medium">{activePhoto.title ?? "Photo"}</h3>
                {activePhoto.uploaded_by_name ? (
                  <p className="text-xs text-white/80">Uploaded by {activePhoto.uploaded_by_name}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="rounded-full border border-white/40 px-3 py-1 text-xs text-white"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-gray-950">
              <Image
                src={activePhoto.url}
                alt={activePhoto.title ?? "Expanded photo"}
                width={1400}
                height={900}
                sizes="(max-width: 1280px) 100vw, 1280px"
                quality={85}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
