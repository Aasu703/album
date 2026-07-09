"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import PhotoGrid from "@/components/PhotoGrid";
import PartyUploader from "../../../../components/PartyUploader";
import type { ApiResponse, PartyWithJoinUrl, Photo } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import FloatingUploadButton from "@/components/FloatingUploadButton";
import LiveBadge from "@/components/LiveBadge";

interface PartyAlbumClientProps {
  joinCode: string;
}

/** Loads party metadata/photos and renders upload + gallery workflow. */
export default function PartyAlbumClient({ joinCode }: PartyAlbumClientProps) {
  const [party, setParty] = useState<PartyWithJoinUrl | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newPhotoIds, setNewPhotoIds] = useState<string[]>([]);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestCreatedAtRef = useRef<string | null>(null);
  const uploaderAnchorRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [partyResponse, photosResponse] = await Promise.all([
        fetch(`/api/parties/${joinCode}`),
        fetch(`/api/parties/${joinCode}/photos`),
      ]);

      const partyPayload = (await partyResponse.json()) as ApiResponse<PartyWithJoinUrl>;
      const photosPayload = (await photosResponse.json()) as ApiResponse<Photo[]>;

      if (process.env.NODE_ENV !== "production") {
        console.log("[PartyAlbumClient] /api/parties response", partyPayload);
        console.log("[PartyAlbumClient] /api/parties/photos response", photosPayload);
      }

      if (!partyResponse.ok || partyPayload.error || !partyPayload.data) {
        throw new Error(partyPayload.error ?? "Unable to load party details.");
      }

      if (!photosResponse.ok || photosPayload.error || !photosPayload.data) {
        throw new Error(photosPayload.error ?? "Unable to load party photos.");
      }

      setParty(partyPayload.data);
      setPhotos(photosPayload.data);
      setNewPhotoIds([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load party album.");
      setParty(null);
      setPhotos([]);
      setNewPhotoIds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [joinCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    latestCreatedAtRef.current = photos[0]?.created_at ?? null;
  }, [photos]);

  useEffect(() => {
    if (!liveNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setLiveNotice(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [liveNotice]);

  useEffect(() => {
    if (newPhotoIds.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNewPhotoIds([]);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [newPhotoIds]);

  const pollForNewPhotos = useCallback(async () => {
    if (!party) {
      return;
    }

    try {
      const latestCreatedAt = latestCreatedAtRef.current;
      const query = latestCreatedAt
        ? `?after=${encodeURIComponent(latestCreatedAt)}`
        : "";

      const response = await fetch(`/api/parties/${joinCode}/photos${query}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as ApiResponse<Photo[]>;

      if (process.env.NODE_ENV !== "production") {
        console.log("[PartyAlbumClient] poll /api/parties/photos response", payload);
      }

      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error ?? "Unable to refresh party photos.");
      }

      if (payload.data.length === 0) {
        return;
      }

      const incomingPhotos = payload.data;
      let mergedIncomingIds: string[] = [];

      setPhotos((current) => {
        const existingIds = new Set(current.map((photo) => photo.id));
        const uniqueIncoming = incomingPhotos.filter((photo) => !existingIds.has(photo.id));

        if (uniqueIncoming.length === 0) {
          return current;
        }

        mergedIncomingIds = uniqueIncoming.map((photo) => photo.id);

        return [...uniqueIncoming, ...current];
      });

      if (mergedIncomingIds.length > 0) {
        setNewPhotoIds(mergedIncomingIds);
        setLiveNotice(
          `${mergedIncomingIds.length} new ${mergedIncomingIds.length === 1 ? "photo" : "photos"} added! 📸`,
        );
      }
    } catch {
      // Keep live polling resilient. Surface errors only on manual refresh/initial load.
    }
  }, [joinCode, party]);

  useEffect(() => {
    if (!party) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollForNewPhotos();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [party, pollForNewPhotos]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        Loading party album...
      </section>
    );
  }

  if (error || !party) {
    return (
      <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900 dark:bg-rose-950/40">
        <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Unable to load party album</h1>
        <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? "Party details are unavailable."}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Retry
        </button>
      </section>
    );
  }

  function scrollToUploader() {
    uploaderAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-[#E9ECEF] bg-linear-to-br from-[#f4f8ff] via-white to-[#eafcee] p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">{party.name}</h1>
            <p className="text-sm text-[#6C757D]">Hosted by {party.host_name}</p>
            {party.description ? <p className="text-sm text-[#1A1A2E]">{party.description}</p> : null}
            <p className="text-xs font-semibold text-[#6C757D]">Join code: {party.join_code}</p>
          </div>

          <LiveBadge />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-[#1A1A2E]">
            {party.members?.length ?? 0} {(party.members?.length ?? 0) === 1 ? "person" : "people"} joined
          </p>

          {party.members && party.members.length > 0 ? (
            <div className="flex items-center">
              {party.members.slice(0, 6).map((member, index) => (
                <div key={`${member.user_id}-${member.user_name}`} className={index === 0 ? "" : "-ml-3"}>
                  <Avatar name={member.user_name} color={member.avatar_color} size="sm" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {liveNotice ? (
        <p className="rounded-2xl border border-[#4D96FF]/35 bg-[#4D96FF]/10 p-3 text-sm text-[#2f6fcc]">
          {liveNotice}
        </p>
      ) : null}

      <div ref={uploaderAnchorRef}>
        <PartyUploader joinCode={joinCode} onUploaded={() => void loadData(true)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[#6C757D]">
        <span>
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
        {refreshing ? <span>Refreshing...</span> : null}
        <button
          type="button"
          onClick={() => void loadData(true)}
          className="min-h-10 rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-xs font-semibold text-[#1A1A2E] shadow-sm transition hover:shadow-md"
        >
          Refresh
        </button>
      </div>

      <PhotoGrid
        photos={photos}
        albumId={party.album_id}
        albumName={party.name}
        newPhotoIds={newPhotoIds}
      />

      <FloatingUploadButton onClick={scrollToUploader} label="Upload" />
    </section>
  );
}
