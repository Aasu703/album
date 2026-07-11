import Image from "next/image";
import Link from "next/link";

import type { Artwork, ArtworkListResult, ArtworkPainter } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const metadata = {
  title: "Browse Paintings — Painting Marketplace",
};

function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") {
    return "Unknown artist";
  }
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}

const LISTING_TYPES: { value: string; label: string }[] = [
  { value: "", label: "All listings" },
  { value: "FOR_SALE", label: "Buy now" },
  { value: "AUCTION", label: "Auctions" },
  { value: "SOCIAL_ONLY", label: "Social only" },
];

async function fetchArtworks(searchParams: { listingType?: string; minPrice?: string; maxPrice?: string }) {
  const params = new URLSearchParams();
  if (searchParams.listingType) params.set("listingType", searchParams.listingType);
  if (searchParams.minPrice) params.set("minPrice", searchParams.minPrice);
  if (searchParams.maxPrice) params.set("maxPrice", searchParams.maxPrice);

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
  searchParams: Promise<{ listingType?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const params = await searchParams;
  const result = await fetchArtworks(params);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E]">Paintings</h1>
        <p className="text-sm text-[#6C757D]">Browse original paintings for sale and live auction.</p>
      </section>

      <section className="flex flex-wrap gap-2">
        {LISTING_TYPES.map((option) => {
          const isActive = (params.listingType ?? "") === option.value;
          const href = option.value ? `/paintings?listingType=${option.value}` : "/paintings";
          return (
            <Link
              key={option.value}
              href={href}
              className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#4D96FF] text-white"
                  : "border border-[#E9ECEF] bg-white text-[#1A1A2E] hover:border-[#4D96FF] hover:text-[#4D96FF]"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </section>

      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#E9ECEF] bg-white p-10 text-center text-sm text-[#6C757D]">
          No paintings match these filters yet.
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((artwork) => (
            <Link
              key={artwork.id}
              href={`/paintings/${artwork.id}`}
              className="group overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-square bg-[#F1F3F5]">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition group-hover:scale-105"
                />
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                  {artwork.listingType.replace("_", " ")}
                </span>
              </div>
              <div className="space-y-1 p-3">
                <h2 className="truncate text-sm font-bold text-[#1A1A2E]">{artwork.title}</h2>
                <p className="truncate text-xs text-[#6C757D]">{painterName(artwork.painterId)}</p>
                {artwork.listingType === "AUCTION" ? (
                  <p className="text-sm font-semibold text-[#4D96FF]">
                    ${artwork.currentHighestBid ?? artwork.price ?? 0} current bid
                  </p>
                ) : artwork.listingType === "FOR_SALE" ? (
                  <p className="text-sm font-semibold text-[#4D96FF]">${artwork.price}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
