"use client";

import { useMemo, useState } from "react";
import { CldImage } from "next-cloudinary";

import type { Photo } from "@/app/lib/types";
import { extractPublicIdFromUrl } from "@/app/lib/cloudinary";

interface PhotoGridProps {
  photos: Photo[];
}

/** Renders photo thumbnails and opens a full-size lightbox on click. */
export default function PhotoGrid({ photos }: PhotoGridProps) {
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  const photoItems = useMemo(
    () =>
      photos
        .map((photo) => ({
          photo,
          publicId: extractPublicIdFromUrl(photo.url),
        }))
        .filter((item) => Boolean(item.publicId)),
    [photos],
  );

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No photos in this album yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photoItems.map(({ photo, publicId }) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActivePhoto(photo)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
          >
            <CldImage
              src={publicId as string}
              alt={photo.title ?? "Album photo"}
              width={300}
              height={300}
              crop="fill"
              gravity="auto"
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
                className="rounded-full border border-white/40 px-3 py-1 text-xs"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-slate-950">
              <CldImage
                src={extractPublicIdFromUrl(activePhoto.url) as string}
                alt={activePhoto.title ?? "Expanded photo"}
                width={1400}
                height={900}
                crop="limit"
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
