"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { api } from "@/lib/api";
import type { Artwork } from "@/app/lib/types";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** The current user's own uploads (public + private), with a visibility toggle and delete. */
export default function ProfileUploads() {
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/artworks/mine");
      setItems(res.data.data.items);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMine();
  }, [fetchMine]);

  async function toggleVisibility(art: Artwork) {
    const next = art.visibility === "private" ? "public" : "private";
    setBusyId(art.id);
    setError(null);
    try {
      await api.patch(`/artworks/${art.id}`, { visibility: next });
      setItems((prev) => prev.map((a) => (a.id === art.id ? { ...a, visibility: next } : a)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(art: Artwork) {
    if (!window.confirm(`Delete “${art.title}”? This can't be undone.`)) return;
    setBusyId(art.id);
    setError(null);
    try {
      await api.delete(`/artworks/${art.id}`);
      setItems((prev) => prev.filter((a) => a.id !== art.id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">My uploads</h2>
          <p className="mt-1 text-sm text-muted">Photos you&apos;ve shared, public or private.</p>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          + Add photo
        </Link>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading your uploads...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline bg-surface/50 p-8 text-center text-sm text-muted">
          You haven&apos;t uploaded any photos yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((art) => {
            const isPrivate = art.visibility === "private";
            return (
              <li
                key={art.id}
                className="group overflow-hidden rounded-xl border border-hairline bg-surface-raised"
              >
                <div className="relative aspect-square bg-surface">
                  <Image
                    src={art.imageUrl}
                    alt={art.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${
                      isPrivate ? "bg-black/70 text-white" : "bg-accent/90 text-background"
                    }`}
                  >
                    {isPrivate ? "🔒 Private" : "🌐 Public"}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{art.title}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleVisibility(art)}
                      disabled={busyId === art.id}
                      className="flex-1 rounded-full border border-hairline px-2 py-1.5 text-xs font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {isPrivate ? "Make public" : "Make private"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(art)}
                      disabled={busyId === art.id}
                      className="rounded-full border border-hairline px-2 py-1.5 text-xs font-semibold text-muted transition-colors duration-300 ease-out hover:border-danger hover:text-danger disabled:opacity-50"
                      aria-label={`Delete ${art.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
