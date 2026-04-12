"use client";

import { ChangeEvent, DragEvent, FormEvent, useState } from "react";

import type { ApiResponse, Photo } from "@/app/lib/types";

interface AlbumOption {
  id: string;
  name: string;
}

interface ImageUploaderProps {
  albums: AlbumOption[];
}

/** Lets a user choose an image and upload it to the server upload API route. */
export default function ImageUploader({ albums }: ImageUploaderProps) {
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /** Captures a file selected with the hidden file input. */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  }

  /** Captures a file dropped into the drag-and-drop area. */
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    setFile(droppedFile);
  }

  /** Prevents default browser behavior during drag-over events. */
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  /** Sends selected image data to the upload API and handles response states. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Please choose an image file first.");
      setLoading(false);
      return;
    }

    if (!albumId) {
      setError("Please choose an album.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("album_id", albumId);
    formData.append("title", title);
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ApiResponse<Photo>;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setSuccess("Photo uploaded successfully.");
      setTitle("");
      setFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <label htmlFor="album-select" className="text-sm font-medium text-slate-700">
          Album
        </label>
        <select
          id="album-select"
          value={albumId}
          onChange={(event) => setAlbumId(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="photo-title" className="text-sm font-medium text-slate-700">
          Title (optional)
        </label>
        <input
          id="photo-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          placeholder="Sunset at the beach"
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
      >
        <p className="text-sm text-slate-700">
          {file ? `Selected: ${file.name}` : "Drag and drop an image here"}
        </p>
        <p className="mt-2 text-xs text-slate-500">or</p>
        <label
          htmlFor="photo-file"
          className="mt-3 inline-block cursor-pointer rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
        >
          Choose file
        </label>
        <input
          id="photo-file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <button
        type="submit"
        disabled={loading || albums.length === 0}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Upload photo"}
      </button>
    </form>
  );
}
