import Link from "next/link";
import { CldImage } from "next-cloudinary";

import type { Album } from "@/app/lib/types";
import { extractPublicIdFromUrl } from "@/app/lib/cloudinary";

interface AlbumCardProps {
  album: Album;
}

/** Renders a single album card with optional Cloudinary cover image. */
export default function AlbumCard({ album }: AlbumCardProps) {
  const coverPublicId = extractPublicIdFromUrl(album.cover_url);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/album/${album.id}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          {coverPublicId ? (
            <CldImage
              src={coverPublicId}
              alt={`${album.name} cover`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              crop="fill"
              gravity="auto"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No cover yet
            </div>
          )}
        </div>
        <div className="space-y-1 p-4">
          <h3 className="text-lg font-semibold text-slate-900">{album.name}</h3>
          <p className="text-xs text-slate-500">
            Created {new Date(album.created_at).toLocaleDateString()}
          </p>
        </div>
      </Link>
    </article>
  );
}
