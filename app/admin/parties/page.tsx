"use client";

import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ConfirmModal from "@/app/admin/_components/ConfirmModal";
import { adminRequest, clearAdminSession } from "@/app/lib/admin-client";
import type { AdminPartyRow } from "@/app/lib/types";

interface QrPreviewState {
  partyName: string;
  joinCode: string;
  joinUrl: string;
  dataUrl: string;
}

/** Admin parties management view with deactivate/delete controls and QR preview. */
export default function AdminPartiesPage() {
  const router = useRouter();
  const [parties, setParties] = useState<AdminPartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminPartyRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<QrPreviewState | null>(null);

  const loadParties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<AdminPartyRow[]>("/api/admin/parties");
      setParties(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load parties.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
      setParties([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  async function handleDeactivate(party: AdminPartyRow) {
    if (!party.is_active || deactivatingId) {
      return;
    }

    setDeactivatingId(party.id);
    setError(null);

    try {
      await adminRequest(`/api/admin/parties/${party.id}`, {
        method: "PATCH",
      });

      setParties((current) =>
        current.map((entry) =>
          entry.id === party.id
            ? {
                ...entry,
                is_active: false,
              }
            : entry,
        ),
      );
      setStatus(`Party \"${party.name}\" was deactivated.`);
    } catch (deactivateError) {
      const message = deactivateError instanceof Error ? deactivateError.message : "Failed to deactivate party.";
      if (/unauthorized/i.test(message)) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      setError(message);
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await adminRequest(`/api/admin/parties/${pendingDelete.id}`, {
        method: "DELETE",
      });

      setParties((current) => current.filter((party) => party.id !== pendingDelete.id));
      setStatus(`Deleted party \"${pendingDelete.name}\".`);
      setPendingDelete(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete party.";
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

  async function handlePreviewQr(party: AdminPartyRow) {
    if (qrLoadingId) {
      return;
    }

    setQrLoadingId(party.id);
    setError(null);

    try {
      const joinUrl = `${window.location.origin}/join/${party.join_code}`;
      const dataUrl = await QRCode.toDataURL(joinUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
      });

      setQrPreview({
        partyName: party.name,
        joinCode: party.join_code,
        joinUrl,
        dataUrl,
      });
    } catch {
      setError("Failed to generate QR code preview.");
    } finally {
      setQrLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void loadParties()}
          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-700 dark:border-t-gray-200" />
          Loading parties...
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

      {!loading && parties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          No parties yet.
        </div>
      ) : null}

      {parties.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Party name</th>
                <th className="px-4 py-3 font-semibold">Host</th>
                <th className="px-4 py-3 font-semibold">Join code</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created at</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => {
                const isDeactivating = deactivatingId === party.id;

                return (
                  <tr key={party.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{party.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{party.host_name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-gray-200 px-2 py-1 font-mono text-xs text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                        {party.join_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{party.member_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          party.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {party.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{new Date(party.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/party/${party.join_code}`}
                          className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-gray-300"
                        >
                          View party album
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handlePreviewQr(party)}
                          disabled={qrLoadingId === party.id}
                          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {qrLoadingId === party.id ? "Loading QR..." : "QR"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(party)}
                          disabled={isDeactivating || !party.is_active}
                          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeactivating ? "Deactivating..." : "Deactivate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(party)}
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
        title="Delete party"
        description="Are you sure? This will remove the party and its member list permanently."
        warning="The shared album remains, but guests will no longer be able to use this join code."
        confirmLabel="Delete party"
        isBusy={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />

      {qrPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">QR for {qrPreview.partyName}</h2>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">Join code: {qrPreview.joinCode}</p>
            <p className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">{qrPreview.joinUrl}</p>
            <Image
              src={qrPreview.dataUrl}
              alt={`QR code for ${qrPreview.joinCode}`}
              width={224}
              height={224}
              unoptimized
              className="mx-auto mt-4 h-56 w-56 rounded-lg border border-gray-200 bg-white p-2"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setQrPreview(null)}
                className="min-h-11 rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
