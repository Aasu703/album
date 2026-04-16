import Image from "next/image";
import Link from "next/link";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { Album } from "@/app/lib/types";

interface AlbumCardProps {
  album: Album;
}

/** Renders a single album card with optional Cloudinary cover image. */
export default function AlbumCard({ album }: AlbumCardProps) {
  const coverUrl = isAllowedRemoteImageUrl(album.cover_url) ? album.cover_url : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      <Link href={`/album/${album.id}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${album.name} cover`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No cover yet
            </div>
          )}
        </div>
        <div className="space-y-1 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{album.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created {new Date(album.created_at).toLocaleDateString()}
          </p>
        </div>
      </Link>
    </article>
  );
}
