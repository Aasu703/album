"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { isAllowedRemoteImageUrl } from "@/app/lib/image";
import type { Photo } from "@/app/lib/types";

interface PhotoGridProps {
  photos: Photo[];
}

interface PhotoItem {
  photo: Photo;
  url: string;
}

/** Renders photo thumbnails and opens a full-size lightbox on click. */
export default function PhotoGrid({ photos }: PhotoGridProps) {
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  const photoItems = useMemo(
    () =>
      photos
        .map((photo) => ({
          photo,
          url: isAllowedRemoteImageUrl(photo.url) ? photo.url : null,
        }))
        .filter((item): item is PhotoItem => Boolean(item.url)),
    [photos],
  );

  if (photoItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        No valid photos to display yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photoItems.map(({ photo, url }) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActivePhoto({ ...photo, url })}
            className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
          >
            <Image
              src={url}
              alt={photo.title ?? "Album photo"}
              width={300}
              height={300}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={75}
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {activePhoto ? (
        <div
          role="presentation"
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between text-white">
              <h3 className="text-sm font-medium">{activePhoto.title ?? "Photo"}</h3>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="rounded-full border border-white/40 px-3 py-1 text-xs text-white"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-gray-950">
              <Image
                src={activePhoto.url}
                alt={activePhoto.title ?? "Expanded photo"}
                width={1400}
                height={900}
                sizes="(max-width: 1280px) 100vw, 1280px"
                quality={85}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
