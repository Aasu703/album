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
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Manage users</h1>
        <p className="mt-1 text-sm text-muted">Ban or unban accounts. Admin accounts cannot be banned.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-300 ease-out ${
              roleFilter === filter.value
                ? 'bg-accent text-background'
                : 'border border-hairline bg-surface text-muted hover:text-foreground'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-10 text-center text-sm text-muted">
          No users match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline bg-background">
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const isAdmin = u.role === 'ADMIN';
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-foreground">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3 text-muted">{u.role.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {u.isBanned ? (
                        <span className="rounded-full bg-danger/15 px-3 py-1 text-xs font-semibold text-danger">
                          Banned
                        </span>
                      ) : (
                        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin || isSelf ? (
                        <span className="text-xs text-muted/70">No actions</span>
                      ) : u.isBanned ? (
                        <button
                          type="button"
                          onClick={() => void handleUnban(u.id)}
                          disabled={busyId === u.id}
                          className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
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
                            className="w-40 rounded-lg border border-hairline bg-surface-raised px-2 py-1 text-xs text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => void handleBan(u.id)}
                            disabled={busyId === u.id}
                            className="rounded-full border border-danger/50 bg-danger/10 px-4 py-1.5 text-xs font-semibold text-danger transition-colors duration-300 ease-out hover:bg-danger/20 disabled:opacity-50"
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
