"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Artwork } from "@/app/lib/types";

interface BidBoxProps {
  artwork: Artwork;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Failed to place bid.";
}

/** Live bid placement widget for an AUCTION listing. */
export default function BidBox({ artwork }: BidBoxProps) {
  const router = useRouter();
  const { user } = useAuth();
  const currentHighest = artwork.currentHighestBid ?? artwork.price ?? 0;
  const [amount, setAmount] = useState(String(currentHighest + 1));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const auctionEnded = artwork.auctionEndTime ? new Date(artwork.auctionEndTime) <= new Date() : false;
  const isOwner =
    user &&
    typeof artwork.painterId === "object" &&
    artwork.painterId !== null &&
    "id" in artwork.painterId &&
    artwork.painterId.id === user.id;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/artworks/${artwork.id}/bid`, { amount: Number(amount) });
      router.refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (auctionEnded) {
    return (
      <p className="rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] p-3 text-sm text-[#6C757D]">
        This auction has ended.
      </p>
    );
  }

  if (isOwner) {
    return (
      <p className="rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] p-3 text-sm text-[#6C757D]">
        This is your own listing.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-[#1A1A2E]" htmlFor="bid-amount">
        Your bid (must exceed ${currentHighest})
      </label>
      <div className="flex gap-2">
        <input
          id="bid-amount"
          type="number"
          min={currentHighest + 1}
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="min-h-11 flex-1 rounded-xl border border-[#E9ECEF] px-3 text-sm outline-none focus:border-[#4D96FF]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-full bg-[#4D96FF] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
        >
          {submitting ? "Placing..." : "Place Bid"}
        </button>
      </div>
      {error ? <p className="text-sm text-[#a93b3b]">{error}</p> : null}
    </form>
  );
}
