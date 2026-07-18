"use client";

import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import GateShell from "./GateShell";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Gate shown to signed-in regular users on /upload: explains the verified-painter
 *  requirement and lets them apply. Reads seller status straight from the session. */
export default function BecomeArtistGate() {
  const { user, refreshUser } = useAuth();
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function handleApplySeller() {
    setApplying(true);
    setApplyError(null);
    try {
      await api.post("/users/apply-seller");
      await refreshUser();
    } catch (err) {
      setApplyError(extractErrorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  const sellerStatus = user?.sellerStatus ?? "none";

  return (
    <GateShell>
      <span className="text-4xl" aria-hidden="true">🎨</span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Become a painter to upload</h1>
      <p className="mt-2 text-sm text-muted">
        Only verified painters can post to the gallery. Apply once and an admin will review your request.
      </p>

      {sellerStatus === "none" && (
        <div className="mt-6 space-y-3">
          {applyError ? <p className="text-sm text-danger">{applyError}</p> : null}
          <button
            onClick={() => void handleApplySeller()}
            disabled={applying}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover disabled:opacity-50"
          >
            {applying ? "Submitting…" : "Apply to become a painter"}
          </button>
        </div>
      )}
      {sellerStatus === "pending" && (
        <span className="mt-6 inline-block rounded-lg bg-warning/15 px-4 py-2 text-sm font-medium text-warning">
          Your painter application is pending review.
        </span>
      )}
      {sellerStatus === "rejected" && (
        <span className="mt-6 inline-block rounded-lg bg-danger/15 px-4 py-2 text-sm font-medium text-danger">
          Your painter application was rejected.
        </span>
      )}
    </GateShell>
  );
}