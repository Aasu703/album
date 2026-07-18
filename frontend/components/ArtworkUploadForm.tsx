"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { api } from "@/lib/api";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Failed to post painting.";
}

interface ArtworkUploadFormProps {
  /** Called after a painting is created successfully. */
  onCreated: () => void;
  /** Label for the submit button. */
  submitLabel?: string;
}

/** Instagram-style upload form: drag-and-drop image picker with a live preview,
 *  title, and description. Shared by the /upload page and the dashboard modal. */
export default function ArtworkUploadForm({ onCreated, submitLabel = "Post painting" }: ArtworkUploadFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep an object URL for the chosen file and revoke it when it changes/unmounts.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function validateAndSet(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Image must be JPEG, PNG, or WEBP.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("Image must be 10MB or smaller.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    validateAndSet(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose an image.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("image", file);

    setSubmitting(true);
    try {
      await api.post("/artworks", formData);
      setTitle("");
      setDescription("");
      setFile(null);
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Drop zone / preview */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-300 ease-out ${
          dragging ? "border-accent bg-accent-soft" : "border-hairline bg-surface-raised hover:border-accent/60"
        }`}
      >
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="Selected preview" fill className="object-cover" unoptimized />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              Click to replace
            </span>
          </>
        ) : (
          <div className="px-6 text-center">
            <span className="text-4xl" aria-hidden="true">🖼️</span>
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag a photo here, or <span className="text-accent">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted">JPEG, PNG, or WEBP · Max 10MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">Title</label>
        <input
          type="text"
          required
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your piece a name"
          className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">Description</label>
        <textarea
          required
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell collectors about the medium, story, or inspiration"
          className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-background shadow-md transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "Posting..." : submitLabel}
      </button>
    </form>
  );
}
