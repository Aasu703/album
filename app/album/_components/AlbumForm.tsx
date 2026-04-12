"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { Album, ApiResponse } from "@/app/lib/types";

/** Submits a new album to the albums API and refreshes the listing page. */
export default function AlbumForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Validates and submits the album payload to the albums API route. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          cover_url: coverUrl,
        }),
      });

      const payload = (await response.json()) as ApiResponse<Album>;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to create album.");
      }

      setName("");
      setCoverUrl("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create album.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Create new album</h2>
      <div className="space-y-1">
        <label htmlFor="album-name" className="text-sm font-medium text-slate-700">
          Album name
        </label>
        <input
          id="album-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          placeholder="Summer 2026"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="cover-url" className="text-sm font-medium text-slate-700">
          Cover image URL (optional)
        </label>
        <input
          id="cover-url"
          type="url"
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          placeholder="https://res.cloudinary.com/..."
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create album"}
      </button>
    </form>
  );
}
