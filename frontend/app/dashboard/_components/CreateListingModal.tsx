"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { ListingType } from "@/app/lib/types";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Failed to create listing.";
}

/** Form for a VERIFIED_ARTIST to create a new painting listing with an image upload. */
export default function CreateListingModal({ isOpen, onClose, onCreated }: CreateListingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listingType, setListingType] = useState<ListingType>("FOR_SALE");
  const [price, setPrice] = useState("");
  const [auctionEndTime, setAuctionEndTime] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setListingType("FOR_SALE");
    setPrice("");
    setAuctionEndTime("");
    setFile(null);
    setError(null);
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
    formData.append("listingType", listingType);
    if (listingType !== "SOCIAL_ONLY") {
      formData.append("price", price);
    }
    if (listingType === "AUCTION") {
      formData.append("auctionEndTime", new Date(auctionEndTime).toISOString());
    }
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
          <h2 className="text-xl font-bold text-white">New Listing</h2>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Listing Type</label>
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value as ListingType)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FOR_SALE">Buy It Now</option>
              <option value="AUCTION">Auction</option>
              <option value="SOCIAL_ONLY">Social only (not for sale)</option>
            </select>
          </div>

          {listingType !== "SOCIAL_ONLY" ? (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">
                {listingType === "AUCTION" ? "Starting price" : "Price"}
              </label>
              <input
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : null}

          {listingType === "AUCTION" ? (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Auction ends at</label>
              <input
                type="datetime-local"
                required
                value={auctionEndTime}
                onChange={(e) => setAuctionEndTime(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-300"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
