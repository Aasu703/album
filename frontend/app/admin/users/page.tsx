'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import type { AuthUser, UserRole } from '@/app/lib/types';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

const ROLE_FILTERS: { label: string; value: UserRole | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Users', value: 'USER' },
  { label: 'Painters', value: 'VERIFIED_ARTIST' },
  { label: 'Admins', value: 'ADMIN' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banReasonDraft, setBanReasonDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (role: UserRole | 'ALL') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users', role === 'ALL' ? {} : { params: { role } });
      setUsers(res.data.data.users);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(roleFilter);
  }, [load, roleFilter]);

  async function handleBan(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/users/${id}/ban`, { reason: banReasonDraft[id] || undefined });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBanned: true } : u)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnban(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/users/${id}/unban`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBanned: false } : u)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Manage users</h1>
        <p className="mt-1 text-sm text-gray-400">Ban or unban accounts. Admin accounts cannot be banned.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              roleFilter === filter.value
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-700 bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center text-sm text-gray-400">
          No users match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-950">
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const isAdmin = u.role === 'ADMIN';
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-white">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3 text-gray-400">{u.role.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <span className="rounded-full bg-red-900/40 px-3 py-1 text-xs font-semibold text-red-300">
                          Banned
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin || isSelf ? (
                        <span className="text-xs text-gray-600">No actions</span>
                      ) : u.isBanned ? (
                        <button
                          type="button"
                          onClick={() => void handleUnban(u.id)}
                          disabled={busyId === u.id}
                          className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Unban
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={banReasonDraft[u.id] ?? ''}
                            onChange={(e) =>
                              setBanReasonDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            className="w-40 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => void handleBan(u.id)}
                            disabled={busyId === u.id}
                            className="rounded-full border border-red-800 bg-red-950/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                          >
                            Ban
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
