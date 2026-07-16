'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuthUser } from '@/app/lib/types';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function AdminPaintersPage() {
  const [applicants, setApplicants] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users/pending-sellers');
      setApplicants(res.data.data.users);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/users/${id}/approve-seller`);
      setApplicants((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/users/${id}/reject-seller`);
      setApplicants((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Painter applications</h1>
        <p className="mt-1 text-sm text-gray-400">Approve or reject users who applied to become verified painters.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading applications...</p>
      ) : applicants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center text-sm text-gray-400">
          No pending applications.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Applied</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-950">
              {applicants.map((applicant) => (
                <tr key={applicant.id}>
                  <td className="px-4 py-3 text-white">
                    {applicant.firstName} {applicant.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{applicant.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(applicant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => void handleApprove(applicant.id)}
                      disabled={busyId === applicant.id}
                      className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(applicant.id)}
                      disabled={busyId === applicant.id}
                      className="rounded-full border border-red-800 bg-red-950/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-950/70 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
