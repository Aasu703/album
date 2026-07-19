"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { api } from "@/lib/api";
import type { MyComment } from "@/app/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

/** Activity feed: every comment the current user has left, linking back to the artwork. */
export default function ProfileComments() {
  const [items, setItems] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/comments/mine");
        if (active) setItems(res.data.data.items);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">My comments</h2>
      <p className="mt-1 text-sm text-muted">Posts you&apos;ve commented on.</p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading your activity...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline bg-surface/50 p-8 text-center text-sm text-muted">
          You haven&apos;t commented on anything yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((comment) => {
            const artwork = typeof comment.artworkId === "object" ? comment.artworkId : null;
            const isPublic = !artwork || artwork.visibility !== "private";
            const body = (
              <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-raised p-3">
                {artwork ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="48px" className="object-cover" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {artwork ? artwork.title : "a deleted post"}
                  </p>
                  <p className="truncate text-sm text-foreground/80">“{comment.text}”</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDate(comment.createdAt)}</span>
              </div>
            );

            // Only public artworks have a viewable detail page; link those, render the rest plain.
            return (
              <li key={comment.id}>
                {artwork && isPublic ? (
                  <Link
                    href={`/paintings/${artwork.id}`}
                    className="block transition-opacity duration-300 ease-out hover:opacity-80"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
