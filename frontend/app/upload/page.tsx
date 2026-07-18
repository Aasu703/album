"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";
import ArtworkUploadForm from "@/components/ArtworkUploadForm";
import { api } from "@/lib/api";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();
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

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-muted">Loading…</div>
    );
  }

  // Not signed in.
  if (!user) {
    return (
      <GateShell>
        <span className="text-4xl" aria-hidden="true">🔒</span>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Sign in to share your work</h1>
        <p className="mt-2 text-sm text-muted">
          You need an account to upload paintings to the gallery.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-hairline bg-surface px-6 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
          >
            Sign up
          </Link>
        </div>
      </GateShell>
    );
  }

  // Signed in, but not a verified artist yet.
  if (user.role === "USER") {
    return (
      <GateShell>
        <span className="text-4xl" aria-hidden="true">🎨</span>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Become a painter to upload</h1>
        <p className="mt-2 text-sm text-muted">
          Only verified painters can post to the gallery. Apply once and an admin will review your request.
        </p>

        {user.sellerStatus === "none" && (
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
        {user.sellerStatus === "pending" && (
          <span className="mt-6 inline-block rounded-lg bg-warning/15 px-4 py-2 text-sm font-medium text-warning">
            Your painter application is pending review.
          </span>
        )}
        {user.sellerStatus === "rejected" && (
          <span className="mt-6 inline-block rounded-lg bg-danger/15 px-4 py-2 text-sm font-medium text-danger">
            Your painter application was rejected.
          </span>
        )}
      </GateShell>
    );
  }

  // Admins manage the gallery but don't post their own work.
  if (user.role === "ADMIN") {
    return (
      <GateShell>
        <span className="text-4xl" aria-hidden="true">🛠️</span>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Admins don&apos;t post artwork</h1>
        <p className="mt-2 text-sm text-muted">
          Uploading is reserved for verified painters. Manage the gallery from the admin console.
        </p>
        <Link
          href="/admin"
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Open admin console
        </Link>
      </GateShell>
    );
  }

  // Verified artist — full upload experience.
  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">New painting</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground">Share your work</h1>
        <p className="mt-2 text-sm text-muted">
          Upload an image and add a title and description. It&apos;ll appear in the gallery right away.
        </p>
      </div>

      <ArtworkUploadForm
        submitLabel="Publish to gallery"
        onCreated={() => router.push("/dashboard")}
      />
    </div>
  );
}
