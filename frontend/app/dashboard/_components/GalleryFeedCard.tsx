import Link from "next/link";
import Image from "next/image";

import ReactionBar from "@/components/ReactionBar";
import { painterName } from "@/app/lib/artwork";
import type { Artwork } from "@/app/lib/types";

/** A single card in the dashboard's "Latest from the gallery" feed: image,
 *  title/artist, and the interactive reaction bar. */
export default function GalleryFeedCard({ artwork }: { artwork: Artwork }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface">
      <Link href={`/paintings/${artwork.id}`} className="group block">
        <div className="relative aspect-square overflow-hidden bg-surface-raised">
          <Image
            src={artwork.imageUrl}
            alt={artwork.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link href={`/paintings/${artwork.id}`}>
            <h3 className="truncate text-lg font-semibold text-foreground transition-colors duration-300 ease-out hover:text-accent">
              {artwork.title}
            </h3>
          </Link>
          <p className="truncate text-xs text-muted">by {painterName(artwork.painterId)}</p>
        </div>
        <div className="mt-auto">
          <ReactionBar artworkId={artwork.id} />
          <Link
            href={`/paintings/${artwork.id}`}
            className="mt-3 inline-block text-xs font-semibold text-muted transition-colors duration-300 ease-out hover:text-accent"
          >
            View & comment →
          </Link>
        </div>
      </div>
    </div>
  );
}
