"use client";

import Image from "next/image";

import type { Photo } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import ReactionBar from "@/components/ReactionBar";

interface PhotoCardProps {
  photo: Photo & { url: string };
  isNew?: boolean;
  isDownloading?: boolean;
  onOpen: () => void;
  onDownload: () => Promise<void> | void;
}

/** Masonry-friendly photo card with overlay metadata and reactions. */
export default function PhotoCard({ photo, isNew = false, isDownloading = false, onOpen, onDownload }: PhotoCardProps) {
  const createdAtLabel = photo.created_at ? new Date(photo.created_at).toLocaleDateString() : "";

  return (
    <article className={`group mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm transition ${isNew ? "photo-card-enter" : ""}`}>
      <div className="relative">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <Image
            src={photo.url}
            alt={photo.title ?? "Album photo"}
            width={1000}
            height={1200}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="h-auto w-full object-cover"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-1 bg-linear-to-t from-black/80 via-black/35 to-transparent p-3 text-white opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="inline-flex items-center gap-2">
              <Avatar
                name={photo.uploaded_by_name ?? "Unknown"}
                color={photo.uploaded_by_avatar_color ?? "#6C757D"}
                size="sm"
              />
              <span className="max-w-24 truncate">{photo.uploaded_by_name ?? "Unknown"}</span>
            </div>
            <button
              type="button"
              onClick={() => void onDownload()}
              className="pointer-events-auto rounded-full border border-white/50 bg-black/30 px-3 py-1 text-[11px] font-semibold transition hover:bg-black/60"
              disabled={isDownloading}
            >
              {isDownloading ? "..." : "Download"}
            </button>
          </div>
          {createdAtLabel ? <p className="mt-1 text-[11px] text-white/80">{createdAtLabel}</p> : null}
        </div>
      </div>

      <div className="space-y-2 p-2 md:space-y-1 md:p-3">
        <div className="md:hidden">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#6C757D]">
            <span className="truncate">{photo.uploaded_by_name ?? "Unknown"}</span>
            <button
              type="button"
              onClick={() => void onDownload()}
              className="rounded-full border border-[#E9ECEF] px-3 py-1 font-semibold text-[#1A1A2E]"
              disabled={isDownloading}
            >
              {isDownloading ? "..." : "Download"}
            </button>
          </div>
        </div>

        <ReactionBar photoId={photo.id} />
      </div>
    </article>
  );
}
