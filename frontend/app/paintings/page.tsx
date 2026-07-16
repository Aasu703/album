import Image from "next/image";
import Link from "next/link";

import type { Artwork, ArtworkListResult, ArtworkPainter } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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

async function fetchArtworks(searchParams: { search?: string }) {
  const params = new URLSearchParams();
  if (searchParams.search) params.set("search", searchParams.search);

  const res = await fetch(`${API_URL}/artworks?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    return { items: [], total: 0, page: 1, limit: 24 } satisfies ArtworkListResult;
  }
  const payload = await res.json();
  return payload.data as ArtworkListResult;
}

export default async function PaintingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const result = await fetchArtworks(params);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Gallery</h1>
        <p className="text-sm text-gray-400">Browse original paintings from independent artists and react to what you love.</p>
      </section>

      <form className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={params.search}
          placeholder="Search paintings..."
          className="min-h-11 flex-1 rounded-full border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center text-sm text-gray-400">
          No paintings match yet.
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((artwork) => (
            <Link
              key={artwork.id}
              href={`/paintings/${artwork.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-sm transition hover:border-indigo-500/50"
            >
              <div className="relative aspect-square bg-gray-800">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="space-y-1 p-3">
                <h2 className="truncate text-sm font-bold text-white">{artwork.title}</h2>
                <p className="truncate text-xs text-gray-400">{painterName(artwork.painterId)}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
