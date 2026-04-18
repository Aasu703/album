"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import StatCard from "@/app/admin/_components/StatCard";
import { adminRequest, clearAdminSession } from "@/app/lib/admin-client";
import type { AdminStats } from "@/app/lib/types";

/** Displays admin overview metrics and recent album/photo activity. */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<AdminStats>("/api/admin/stats");
      setStats(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load dashboard.";

      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
        Loading dashboard...
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-200">Unable to load dashboard</h2>
        <p className="text-sm text-red-700 dark:text-red-200">{error ?? "Dashboard data is unavailable."}</p>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Albums" value={stats.total_albums} icon={<span>A</span>} />
        <StatCard label="Total Photos" value={stats.total_photos} icon={<span>P</span>} />
        <StatCard label="Total Users" value={stats.total_users} icon={<span>U</span>} />
        <StatCard label="Total Parties" value={stats.total_parties} icon={<span>T</span>} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Albums</h2>
          {stats.recent_albums.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">No albums yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.recent_albums.map((album) => (
                <li key={album.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{album.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Created by {album.created_by_name ?? "Unknown"} on {new Date(album.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Photos</h2>
          {stats.recent_photos.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">No photos yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.recent_photos.map((photo) => (
                <li key={photo.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{photo.title ?? "Untitled"}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Album: {photo.album_name ?? "Unknown"} | Uploaded by {photo.uploaded_by_name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(photo.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
