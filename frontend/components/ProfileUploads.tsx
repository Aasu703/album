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

interface ProfileUploadsProps {
  /** Reports the current number of uploads to the parent (for the profile header stat). */
  onCountChange?: (count: number) => void;
}

/** Instagram-style grid of the current user's own uploads (public + private),
 *  with a hover overlay for toggling visibility and deleting. */
export default function ProfileUploads({ onCountChange }: ProfileUploadsProps) {
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/artworks/mine");
      const list: Artwork[] = res.data.data.items;
      setItems(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

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
      setItems((prev) => {
        const next = prev.filter((a) => a.id !== art.id);
        onCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Loading your posts...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground text-3xl">
          📷
        </span>
        <p className="text-lg font-semibold text-foreground">No posts yet</p>
        <p className="text-sm text-muted">Photos you share will show up here.</p>
        <Link
          href="/upload"
          className="mt-1 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Share your first photo
        </Link>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {items.map((art) => {
          const isPrivate = art.visibility === "private";
          return (
            <div key={art.id} className="group relative aspect-square overflow-hidden bg-surface-raised">
              <Image
                src={art.imageUrl}
                alt={art.title}
                fill
                sizes="(max-width: 640px) 33vw, 300px"
                className="object-cover"
              />

              {/* Visibility badge, always visible. */}
              <span
                className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${
                  isPrivate ? "bg-black/70 text-white" : "bg-white/85 text-black"
                }`}
              >
                {isPrivate ? "🔒 Private" : "🌐 Public"}
              </span>

              {/* Hover overlay with actions. */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => void toggleVisibility(art)}
                  disabled={busyId === art.id}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white disabled:opacity-50"
                >
                  {isPrivate ? "Make public" : "Make private"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(art)}
                  disabled={busyId === art.id}
                  className="rounded-full bg-danger/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-danger disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
