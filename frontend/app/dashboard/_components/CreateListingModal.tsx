"use client";

import { useState } from "react";

import { api } from "@/lib/api";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

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

/** Form for a VERIFIED_ARTIST to post a new painting to the gallery. */
export default function CreateListingModal({ isOpen, onClose, onCreated }: CreateListingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setFile(null);
    setError(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (selected) {
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
    }
    setFile(selected);
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
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-3xl bg-surface p-6 shadow-2xl border border-hairline">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-foreground">Post a painting</h2>
          <button type="button" onClick={onClose} className="text-muted transition-colors duration-300 ease-out hover:text-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Title</label>
            <input
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-surface-raised border border-hairline rounded-lg text-foreground outline-none transition-colors duration-300 ease-out focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Description</label>
            <textarea
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-surface-raised border border-hairline rounded-lg text-foreground outline-none transition-colors duration-300 ease-out focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent"
            />
            <p className="mt-1 text-xs text-muted">JPEG, PNG, or WEBP. Max 10MB.</p>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-background font-semibold rounded-lg shadow-md transition-colors duration-300 ease-out disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post painting"}
          </button>
        </form>
      </div>
    </div>
  );
}
