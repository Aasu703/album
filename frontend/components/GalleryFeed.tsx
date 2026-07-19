"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { Artwork, ArtworkListResult, ArtworkPainter } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const PAGE_SIZE = 6;

function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") return "Unknown artist";
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}

interface GalleryFeedProps {
  search?: string;
}

/**
 * Instagram-style vertical feed with infinite scroll. Pages are fetched lazily as the user
 * nears the bottom (via IntersectionObserver), so an arbitrarily large gallery never loads
 * all rows at once — the DOM and network grow only as far as the visitor actually scrolls.
 */
export default function GalleryFeed({ search = "" }: GalleryFeedProps) {
  const [items, setItems] = useState<Artwork[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  // Refs guard against overlapping/duplicate fetches without re-creating callbacks.
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const doneRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || doneRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const nextPage = pageRef.current + 1;
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(nextPage));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_URL}/artworks?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed");
      const payload = await res.json();
      const data = payload.data as ArtworkListResult;

      pageRef.current = nextPage;
      setTotal(data.total);
      // Dedupe by id when appending: guards against any double-fetch race producing
      // duplicate React keys (e.g. React StrictMode double-invoking effects in dev).
      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const fresh = data.items.filter((a) => !seen.has(a.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });

      if (data.items.length === 0 || nextPage * PAGE_SIZE >= data.total) {
        doneRef.current = true;
        setReachedEnd(true);
      }
    } catch {
      setError("Couldn't load more paintings. Scroll up and back down to retry.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [search]);

  // One-time initial load. The parent remounts this component (via `key={search}`) when the
  // search term changes, so state resets naturally — no manual reset effect (which, by clearing
  // the loading guard, previously let StrictMode's double-mount fetch page 1 twice).
  const initedRef = useRef(false);
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    void loadMore();
  }, [loadMore]);

  // Observe the sentinel; reconnecting after each page keeps filling until it leaves view.
  useEffect(() => {
    if (reachedEnd) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, items.length, reachedEnd]);

  const isEmpty = !loading && items.length === 0;

  return (
    <>
      {isEmpty ? (
        <p className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-10 text-center text-sm text-muted">
          No paintings match yet.
        </p>
      ) : (
        <section className="flex flex-col gap-6">
          {items.map((artwork) => (
            <Link
              key={artwork.id}
              href={`/paintings/${artwork.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm transition-colors duration-300 ease-out hover:border-accent/60"
            >
              <div className="relative aspect-[4/3] w-full bg-surface-raised">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
              <div className="space-y-1 p-4">
                <h2 className="truncate text-lg font-bold text-foreground">{artwork.title}</h2>
                <p className="truncate text-sm text-muted">{painterName(artwork.painterId)}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Sentinel + status line. The observer watches this element. */}
      <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
        {loading ? (
          <p className="text-sm text-muted">Loading more…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : reachedEnd && items.length > 0 ? (
          <p className="text-xs uppercase tracking-wide text-muted/70">You&apos;ve reached the end</p>
        ) : null}
      </div>
    </>
  );
}
