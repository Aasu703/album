import Image from "next/image";
import { notFound } from "next/navigation";

import type { Artwork, ArtworkPainter, ReactionSummary } from "@/app/lib/types";
import ReactionBar from "@/components/ReactionBar";
import CommentSection from "@/components/CommentSection";

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

async function fetchReactionSummary(id: string): Promise<ReactionSummary> {
  const res = await fetch(`${API_URL}/artworks/${id}/reactions`, { cache: "no-store" });
  if (!res.ok) {
    return { counts: {}, total: 0, myReaction: null };
  }
  const payload = await res.json();
  return payload.data as ReactionSummary;
}

export default async function PaintingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [artwork, reactionSummary] = await Promise.all([fetchArtwork(id), fetchReactionSummary(id)]);

  if (!artwork) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row">
      <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-3xl bg-surface lg:max-w-xl">
        <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">{artwork.title}</h1>
          <p className="mt-1 text-sm text-muted">by {painterName(artwork.painterId)}</p>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{artwork.description}</p>

        <ReactionBar artworkId={artwork.id} initialSummary={reactionSummary} />

        <div className="border-t border-hairline pt-6">
          <CommentSection artworkId={artwork.id} />
        </div>
      </div>
    </main>
  );
}
