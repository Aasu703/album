"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmModal from "@/app/admin/_components/ConfirmModal";
import { adminRequest, clearAdminSession } from "@/app/lib/admin-client";
import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { AdminAlbumRow } from "@/app/lib/types";

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

/** Admin albums management view with search, download, and delete actions. */
export default function AdminAlbumsPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<AdminAlbumRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadingAlbumId, setDownloadingAlbumId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminAlbumRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<AdminAlbumRow[]>("/api/admin/albums");
      setAlbums(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load albums.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  const filteredAlbums = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return albums;
    }

    return albums.filter((album) => album.name.toLowerCase().includes(query));
  }, [albums, search]);

  async function handleDownloadAll(album: AdminAlbumRow) {
    if (downloadingAlbumId || album.photo_urls.length === 0) {
      return;
    }

    setStatus(null);
    setError(null);
    setDownloadingAlbumId(album.id);

    try {
      const response = await fetch("/api/download/album", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoUrls: album.photo_urls,
          albumName: album.name,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create album ZIP.");
      }

      const blob = await response.blob();
      const fallback = `${toSafeFilename(album.name, "album")}.zip`;
      const filename = getDownloadFilename(response.headers.get("content-disposition"), fallback);
      startBlobDownload(blob, filename);

      const warning = response.headers.get("x-download-warning");
      setStatus(warning ?? `Download started for ${album.name}.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download album.");
    } finally {
      setDownloadingAlbumId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await adminRequest(`/api/admin/albums/${pendingDelete.id}`, {
        method: "DELETE",
      });

      setAlbums((current) => current.filter((album) => album.id !== pendingDelete.id));
      setStatus(`Deleted album \"${pendingDelete.name}\".`);
      setPendingDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete album.";
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
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search albums by name"
          className="min-h-11 w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        <button
          type="button"
          onClick={() => void loadAlbums()}
          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
          Loading albums...
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

      {!loading && filteredAlbums.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          No albums yet. Create one! <Link href="/album" className="font-semibold text-blue-600 hover:text-blue-700">Go to Albums</Link>
        </div>
      ) : null}

      {filteredAlbums.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Cover</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Photos</th>
                <th className="px-4 py-3 font-semibold">Created by</th>
                <th className="px-4 py-3 font-semibold">Created at</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlbums.map((album) => {
                const coverUrl = isAllowedRemoteImageUrl(album.cover_url) ? album.cover_url : null;
                const isDownloading = downloadingAlbumId === album.id;

                return (
                  <tr key={album.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        {coverUrl ? (
                          <Image src={coverUrl} alt={`${album.name} cover`} fill className="object-cover" sizes="64px" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-gray-300">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{album.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{album.photo_count}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{album.created_by_name ?? "Unknown"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{new Date(album.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/album/${album.id}`}
                          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-gray-300"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDownloadAll(album)}
                          disabled={isDownloading || album.photo_count === 0}
                          title={album.photo_count === 0 ? "No photos yet" : "Download all photos in this album"}
                          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDownloading ? "Building ZIP..." : "Download All"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(album)}
                          className="min-h-11 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete album"
        description="Are you sure? This will delete the album and all its photos permanently."
        confirmLabel="Delete album"
        warning="This action is permanent and cannot be undone."
        isBusy={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
}
