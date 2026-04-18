"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/admin/_components/ConfirmModal";
import { adminRequest, clearAdminSession } from "@/app/lib/admin-client";
import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { AdminPhotoRow } from "@/app/lib/types";

const PAGE_SIZE = 20;

/** Reads a filename from Content-Disposition if available. */
function getDownloadFilename(header: string | null, fallback: string) {
  if (!header) {
    return fallback;
  }

  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
}

/** Returns a safe fallback filename for browser downloads. */
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

/** Triggers a browser file download from a blob payload. */
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

/** Admin photos management view with album filtering and pagination. */
export default function AdminPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<AdminPhotoRow[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminPhotoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<AdminPhotoRow[]>("/api/admin/photos");
      setPhotos(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load photos.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const albumOptions = useMemo(
    () =>
      Array.from(
        new Map(
          photos
            .filter((photo) => Boolean(photo.album_name))
            .map((photo) => [photo.album_id, photo.album_name as string]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [photos],
  );

  const filteredPhotos = useMemo(() => {
    if (selectedAlbumId === "all") {
      return photos;
    }

    return photos.filter((photo) => photo.album_id === selectedAlbumId);
  }, [photos, selectedAlbumId]);

  const totalPages = Math.max(Math.ceil(filteredPhotos.length / PAGE_SIZE), 1);
  const activePage = Math.min(page, totalPages);

  const pagedPhotos = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredPhotos.slice(start, start + PAGE_SIZE);
  }, [activePage, filteredPhotos]);

  useEffect(() => {
    setPage(1);
  }, [selectedAlbumId]);

  async function handleDownload(photo: AdminPhotoRow) {
    if (downloadingPhotoId) {
      return;
    }

    setStatus(null);
    setError(null);
    setDownloadingPhotoId(photo.id);

    try {
      const response = await fetch(
        `/api/download?url=${encodeURIComponent(photo.url)}&filename=${encodeURIComponent(photo.title ?? "photo")}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to download photo.");
      }

      const blob = await response.blob();
      const fallback = `${toSafeFilename(photo.title ?? "photo", "photo")}.jpg`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);
      startBlobDownload(blob, filename);
      setStatus("Photo download started.");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download photo.");
    } finally {
      setDownloadingPhotoId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await adminRequest(`/api/admin/photos/${pendingDelete.id}`, {
        method: "DELETE",
      });

      setPhotos((current) => current.filter((photo) => photo.id !== pendingDelete.id));
      setStatus(`Deleted photo \"${pendingDelete.title ?? "Untitled"}\".`);
      setPendingDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete photo.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedAlbumId}
          onChange={(event) => setSelectedAlbumId(event.target.value)}
          className="min-h-11 w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        >
          <option value="all">All albums</option>
          {albumOptions.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadPhotos()}
          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
          Loading photos...
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
          {status}
        </p>
      ) : null}

      {!loading && filteredPhotos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          No photos yet.
        </div>
      ) : null}

      {pagedPhotos.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pagedPhotos.map((photo) => {
              const imageUrl = isAllowedRemoteImageUrl(photo.url) ? photo.url : null;
              const isDownloading = downloadingPhotoId === photo.id;

              return (
                <article
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={photo.title ?? "Photo"} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-300">Unavailable</span>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{photo.title ?? "Untitled"}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Album: {photo.album_name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Uploader: {photo.uploaded_by_name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(photo.created_at).toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(photo)}
                        disabled={isDownloading}
                        className="min-h-11 flex-1 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDownloading ? "Downloading..." : "Download"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(photo)}
                        className="min-h-11 flex-1 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-gray-700 dark:text-gray-200">Page {activePage} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={activePage === 1}
                className="min-h-11 rounded-full bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={activePage === totalPages}
                className="min-h-11 rounded-full bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete photo"
        description="Are you sure? This photo will be deleted permanently."
        warning="This action also removes the file from Cloudinary."
        confirmLabel="Delete photo"
        isBusy={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
}
