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
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-lg space-y-4 rounded-3xl bg-gray-900 p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Post a painting</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
            <input
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
            <textarea
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-300"
            />
            <p className="mt-1 text-xs text-gray-500">JPEG, PNG, or WEBP. Max 10MB.</p>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post painting"}
          </button>
        </form>
      </div>
    </div>
  );
}
