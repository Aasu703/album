"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

import type { Photo } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import ReactionBar from "@/components/ReactionBar";

interface LightboxProps {
  photos: Array<Photo & { url: string }>;
  activeIndex: number;
  onClose: () => void;
  onChange: (nextIndex: number) => void;
}

/** Fullscreen photo lightbox with keyboard and swipe navigation. */
export default function Lightbox({ photos, activeIndex, onClose, onChange }: LightboxProps) {
  const touchStartXRef = useRef<number | null>(null);
  const photo = photos[activeIndex];

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photos.length - 1;

  const createdAtLabel = useMemo(() => {
    if (!photo?.created_at) {
      return "";
    }

    return new Date(photo.created_at).toLocaleString();
  }, [photo?.created_at]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && hasPrev) {
        onChange(activeIndex - 1);
      }

      if (event.key === "ArrowRight" && hasNext) {
        onChange(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, hasNext, hasPrev, onChange, onClose]);

  if (!photo) {
    return null;
  }

  async function handleDownload() {
    const filename = photo.title?.trim() || "photo";
    const response = await fetch(
      `/api/download?url=${encodeURIComponent(photo.url)}&filename=${encodeURIComponent(filename)}`,
    );

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${filename}.jpg`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (startX === null || endX === null) {
      return;
    }

    const delta = endX - startX;

    if (delta > 45 && hasPrev) {
      onChange(activeIndex - 1);
      return;
    }

    if (delta < -45 && hasNext) {
      onChange(activeIndex + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-80 bg-black/90 px-3 py-4 sm:px-8" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close photo viewer"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div
        className="relative z-81 mx-auto flex h-full w-full max-w-6xl flex-col justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mb-3 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-semibold">{photo.title ?? "Photo"}</p>
            <div className="mt-1 inline-flex items-center gap-2 text-xs text-white/80">
              <Avatar
                name={photo.uploaded_by_name ?? "Unknown"}
                color={photo.uploaded_by_avatar_color ?? "#6C757D"}
                size="sm"
              />
              <span>{photo.uploaded_by_name ?? "Unknown"}</span>
              {createdAtLabel ? <span>{createdAtLabel}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="min-h-10 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/60">
          <Image
            src={photo.url}
            alt={photo.title ?? "Expanded photo"}
            width={1400}
            height={1000}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="max-h-[72vh] w-full object-contain"
          />

          {hasPrev ? (
            <button
              type="button"
              onClick={() => onChange(activeIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 px-3 py-2 text-white transition hover:bg-black/60"
              aria-label="Previous photo"
            >
              ←
            </button>
          ) : null}

          {hasNext ? (
            <button
              type="button"
              onClick={() => onChange(activeIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/40 px-3 py-2 text-white transition hover:bg-black/60"
              aria-label="Next photo"
            >
              →
            </button>
          ) : null}
        </div>

        <div className="mt-3 rounded-2xl bg-white p-3">
          <ReactionBar photoId={photo.id} />
        </div>
      </div>
    </div>
  );
}
