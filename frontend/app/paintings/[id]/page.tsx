import Image from "next/image";
import { notFound } from "next/navigation";

import type { Artwork, ArtworkPainter } from "@/app/lib/types";
import BidBox from "./_components/BidBox";
import BuyNowCheckout from "./_components/BuyNowCheckout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") {
    return "Unknown artist";
  }
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}

async function fetchArtwork(id: string): Promise<Artwork | null> {
  const res = await fetch(`${API_URL}/artworks/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  const payload = await res.json();
  return payload.data.artwork as Artwork;
}

export default async function PaintingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ redirect_status?: string }>;
}) {
  const { id } = await params;
  const { redirect_status: redirectStatus } = await searchParams;
  const artwork = await fetchArtwork(id);

  if (!artwork) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-3xl bg-[#F1F3F5] lg:max-w-xl">
        <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <span className="inline-flex rounded-full bg-[#F8F9FA] px-3 py-1 text-xs font-semibold text-[#6C757D]">
            {artwork.listingType.replace("_", " ")}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1A1A2E]">{artwork.title}</h1>
          <p className="mt-1 text-sm text-[#6C757D]">by {painterName(artwork.painterId)}</p>
        </div>

        <p className="text-sm leading-relaxed text-[#1A1A2E]">{artwork.description}</p>

        {redirectStatus === "succeeded" ? (
          <p className="rounded-xl border border-[#6BCB77]/40 bg-[#6BCB77]/10 p-3 text-sm font-semibold text-[#2f7a3c]">
            Purchase complete! The artist has been notified.
          </p>
        ) : redirectStatus === "processing" ? (
          <p className="rounded-xl border border-[#FFC93C]/40 bg-[#FFC93C]/10 p-3 text-sm font-semibold text-[#8a6a14]">
            Your payment is processing — this page will update once it's confirmed.
          </p>
        ) : null}

        {artwork.status === "SOLD" ? (
          <p className="rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] p-3 text-sm font-semibold text-[#6C757D]">
            This piece has been sold.
          </p>
        ) : artwork.listingType === "AUCTION" ? (
          <BidBox artwork={artwork} />
        ) : artwork.listingType === "FOR_SALE" ? (
          <BuyNowCheckout artwork={artwork} />
        ) : null}
      </div>
    </main>
  );
}
