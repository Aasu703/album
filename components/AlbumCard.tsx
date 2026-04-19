import Image from "next/image";
import Link from "next/link";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { Album } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import { generateAvatarColor } from "@/lib/avatar";

interface AlbumCardProps {
  album: Album & { photo_count?: number };
}

/** Renders a single album card with optional Cloudinary cover image. */
export default function AlbumCard({ album }: AlbumCardProps) {
  const coverUrl = isAllowedRemoteImageUrl(album.cover_url) ? album.cover_url : null;
  const creatorName = album.created_by_name ?? "Unknown";
  const creatorColor = generateAvatarColor(`creator:${album.created_by ?? creatorName}`);
  const photoCount = album.photo_count ?? 0;
  const initial = album.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-sm transition duration-200 hover:scale-[1.03] hover:shadow-md">
      <Link href={`/album/${album.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]">
        <div className="relative aspect-square w-full overflow-hidden bg-[#F8F9FA]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${album.name} cover`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-linear-to-br from-[#4D96FF] to-[#6BCB77] text-4xl font-bold text-white">
              {initial}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <h3 className="truncate text-lg font-bold tracking-tight">{album.name}</h3>
            <div className="mt-2 inline-flex items-center gap-2">
              <Avatar name={creatorName} color={creatorColor} size="sm" />
              <span className="max-w-28 truncate text-xs font-semibold">{creatorName}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
