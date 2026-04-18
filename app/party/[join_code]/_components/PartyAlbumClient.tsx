"use client";

import { useCallback, useEffect, useState } from "react";

import PhotoGrid from "@/components/PhotoGrid";
import PartyUploader from "@/components/PartyUploader";
import type { ApiResponse, PartyWithJoinUrl, Photo } from "@/app/lib/types";

interface PartyAlbumClientProps {
  joinCode: string;
}

/** Loads party metadata/photos and renders upload + gallery workflow. */
export default function PartyAlbumClient({ joinCode }: PartyAlbumClientProps) {
  const [party, setParty] = useState<PartyWithJoinUrl | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (!partyResponse.ok || partyPayload.error || !partyPayload.data) {
        throw new Error(partyPayload.error ?? "Unable to load party details.");
      }

      if (!photosResponse.ok || photosPayload.error || !photosPayload.data) {
        throw new Error(photosPayload.error ?? "Unable to load party photos.");
      }

      setParty(partyPayload.data);
      setPhotos(photosPayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load party album.");
      setParty(null);
      setPhotos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [joinCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{party.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Hosted by {party.host_name}</p>
        {party.description ? <p className="text-sm text-gray-700 dark:text-gray-200">{party.description}</p> : null}
        <p className="text-xs text-gray-500 dark:text-gray-400">Join code: {party.join_code}</p>
      </header>

      <PartyUploader joinCode={joinCode} onUploaded={() => void loadData(true)} />

      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
        {refreshing ? <span>Refreshing...</span> : null}
        <button
          type="button"
          onClick={() => void loadData(true)}
          className="min-h-10 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-900 transition hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      <PhotoGrid photos={photos} albumId={party.album_id} albumName={party.name} />
    </section>
  );
}
