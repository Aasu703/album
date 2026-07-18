import Link from "next/link";
import Image from "next/image";

import type { Artwork } from "@/app/lib/types";

/** A card for one of the signed-in artist's own paintings, shown in the
 *  "Your paintings" section of the dashboard. */
export default function ArtistArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link
      href={`/paintings/${artwork.id}`}
      className="group block overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 ease-out hover:border-accent/60"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-raised">
        <Image
          src={artwork.imageUrl}
          alt={artwork.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-6">
        <h3 className="text-xl font-bold">{artwork.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{artwork.description}</p>
      </div>
    </Link>
  );
}