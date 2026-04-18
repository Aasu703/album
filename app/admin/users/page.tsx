"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ConfirmModal from "@/app/admin/_components/ConfirmModal";
import { adminRequest, clearAdminSession } from "@/app/lib/admin-client";
import type { AdminUserRow } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import { generateAvatarColor } from "@/lib/avatar";

/** Admin users management view with safe delete confirmations. */
export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<AdminUserRow[]>("/api/admin/users");
      setUsers(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load users.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleDeleteConfirmed() {
    if (!pendingDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await adminRequest(`/api/admin/users/${pendingDelete.id}`, {
        method: "DELETE",
      });

      setUsers((current) => current.filter((user) => user.id !== pendingDelete.id));
      setStatus(`Deleted user \"${pendingDelete.name}\".`);
      setPendingDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete user.";
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void loadUsers()}
          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
          Loading users...
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

      {!loading && users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          No users yet.
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Albums created</th>
                <th className="px-4 py-3 font-semibold">Photos uploaded</th>
                <th className="px-4 py-3 font-semibold">Joined at</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Avatar name={user.name} color={generateAvatarColor(user.email)} size="sm" />
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{user.email}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{user.album_count}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{user.photo_count}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(user)}
                      className="min-h-11 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                    >
                      Delete user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete user"
        description="This will remove the user record but keep their content."
        warning="Albums and photos stay, but the user profile itself is permanently removed."
        confirmLabel="Delete user"
        isBusy={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </div>
  );
}
