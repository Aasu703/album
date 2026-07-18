import Image from "next/image";
import Link from "next/link";

import type { Artwork, ArtworkListResult, ArtworkPainter } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const PAGE_SIZE = 8;

export const metadata = {
  title: "Browse Paintings — Painting Gallery",
};

function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") {
    return "Unknown artist";
  }
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}

async function fetchArtworks(search: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));

  const res = await fetch(`${API_URL}/artworks?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    return { items: [], total: 0, page, limit: PAGE_SIZE } satisfies ArtworkListResult;
  }
  const payload = await res.json();
  return payload.data as ArtworkListResult;
}

/** Builds a querystring for a given page, preserving the active search term. */
function pageHref(search: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  return `/paintings?${params.toString()}`;
}

export default async function PaintingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;

  // Clamp the requested page to a sane positive integer.
  const requestedPage = Number(params.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const result = await fetchArtworks(search, page);
  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  const currentPage = Math.min(result.page, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="space-y-1">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Gallery</h1>
        <p className="text-sm text-muted">Browse original paintings from independent artists and react to what you love.</p>
      </section>

      <form className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search paintings..."
          className="min-h-11 flex-1 rounded-full border border-hairline bg-surface px-4 text-sm text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-10 text-center text-sm text-muted">
          No paintings match yet.
        </p>
      ) : (
        <section className="flex flex-col gap-6">
          {result.items.map((artwork) => (
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

      {totalPages > 1 ? (
        <nav className="mt-2 flex items-center justify-between gap-3" aria-label="Gallery pagination">
          {hasPrev ? (
            <Link
              href={pageHref(search, currentPage - 1)}
              className="min-h-10 rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
            >
              ← Previous
            </Link>
          ) : (
            <span className="min-h-10 cursor-not-allowed rounded-full border border-hairline bg-surface/50 px-4 py-2 text-sm font-semibold text-muted/50">
              ← Previous
            </span>
          )}

          <span className="text-sm text-muted">
            Page {currentPage} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={pageHref(search, currentPage + 1)}
              className="min-h-10 rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
            >
              Next →
            </Link>
          ) : (
            <span className="min-h-10 cursor-not-allowed rounded-full border border-hairline bg-surface/50 px-4 py-2 text-sm font-semibold text-muted/50">
              Next →
            </span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
