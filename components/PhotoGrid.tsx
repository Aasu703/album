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

/** Reads a filename from Content-Disposition if available. */
function getDownloadFilename(header: string | null, fallback: string) {
  if (!header) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
}

/** Renders photo thumbnails, selection controls, and album download actions. */
export default function PhotoGrid({ photos, albumId, albumName }: PhotoGridProps) {
  const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

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

  async function downloadArchive(mode: "all" | "selected") {
    if (mode === "selected" && selectedPhotoIds.length === 0) {
      setDownloadError("Select at least one photo to download selected images.");
      return;
    }

    setDownloadError(null);
    setDownloadStatus(null);

    if (mode === "all") {
      setIsDownloadingAll(true);
    } else {
      setIsDownloadingSelected(true);
    }

    try {
      const query =
        mode === "selected"
          ? `?photo_ids=${encodeURIComponent(selectedPhotoIds.join(","))}`
          : "";

      const response = await fetch(`/api/albums/${albumId}/download${query}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create download archive.");
      }

      const blob = await response.blob();
      const fallback = `${albumName.toLowerCase().replace(/\s+/g, "-") || "album"}-${mode}.zip`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      const warning = response.headers.get("x-download-warning");
      setDownloadStatus(warning ?? "Download started.");
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed.");
    } finally {
      if (mode === "all") {
        setIsDownloadingAll(false);
      } else {
        setIsDownloadingSelected(false);
      }
    }
  }

  if (photoItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        No valid photos to display yet.
      </div>
    );
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
            className="min-h-10 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="min-h-10 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
            disabled={selectedCount === 0}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void downloadArchive("selected")}
            disabled={selectedCount === 0 || isDownloadingSelected || isDownloadingAll}
            className="min-h-10 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          >
            {isDownloadingSelected ? "Preparing selected..." : "Download selected"}
          </button>
          <button
            type="button"
            onClick={() => void downloadArchive("all")}
            disabled={isDownloadingAll || isDownloadingSelected}
            className="min-h-10 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloadingAll ? "Preparing album..." : "Download full album"}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photoItems.map(({ photo, url }) => {
          const checked = selectedPhotoIds.includes(photo.id);

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
              <label className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePhotoSelection(photo.id)}
                  className="h-3.5 w-3.5 accent-emerald-500"
                />
                Select
              </label>
            </div>
          );
        })}
      </div>

      {activePhoto ? (
        <div
          role="presentation"
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-white">
              <h3 className="text-sm font-medium">{activePhoto.title ?? "Photo"}</h3>
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
