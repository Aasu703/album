'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalPainters: number;
  pendingApplications: number;
  totalPaintings: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const [allUsersRes, paintersRes, pendingRes, artworksRes] = await Promise.all([
          api.get('/users'),
          api.get('/users', { params: { role: 'VERIFIED_ARTIST' } }),
          api.get('/users/pending-sellers'),
          api.get('/artworks', { params: { limit: 1 } }),
        ]);

        setStats({
          totalUsers: allUsersRes.data.data.users.length,
          totalPainters: paintersRes.data.data.users.length,
          pendingApplications: pendingRes.data.data.users.length,
          totalPaintings: artworksRes.data.data.total,
        });
      } catch {
        setError('Failed to load admin stats.');
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-400">A snapshot of the gallery&apos;s users and content.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading stats...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-sm text-gray-400">Total users</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-sm text-gray-400">Verified painters</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalPainters}</p>
          </div>
          <Link
            href="/admin/painters"
            className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-indigo-500/50"
          >
            <p className="text-sm text-gray-400">Pending applications</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">{stats.pendingApplications}</p>
          </Link>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-sm text-gray-400">Total paintings</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalPaintings}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
