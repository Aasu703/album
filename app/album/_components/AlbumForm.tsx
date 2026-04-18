"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { Album, ApiResponse } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

const MAX_ALBUM_NAME_LENGTH = 80;

/** Submits a new album to the albums API and refreshes the listing page. */
export default function AlbumForm() {
  const router = useRouter();
  const { identity } = useIdentity();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Validates and submits the album payload to the albums API route. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!identity) {
      setError("Please set your identity first.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          created_by: identity.id,
        }),
      });

      const payload = (await response.json()) as ApiResponse<Album>;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to create album.");
      }

      setName("");
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
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Create new album</h2>
      <div className="space-y-1">
        <label htmlFor="album-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Album name
        </label>
        <input
          id="album-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={MAX_ALBUM_NAME_LENGTH}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-gray-500"
          placeholder="Summer 2026"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">Maximum {MAX_ALBUM_NAME_LENGTH} characters.</p>
      </div>
      {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create album"}
      </button>
    </form>
  );
}
