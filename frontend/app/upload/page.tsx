"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import ArtworkUploadForm from "@/components/ArtworkUploadForm";
import SignedOutGate from "./_components/SignedOutGate";
import BecomeArtistGate from "./_components/BecomeArtistGate";
import AdminGate from "./_components/AdminGate";

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-muted">Loading…</div>;
  }

  if (!user) return <SignedOutGate />;
  if (user.role === "USER") return <BecomeArtistGate />;
  if (user.role === "ADMIN") return <AdminGate />;

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

      <ArtworkUploadForm submitLabel="Publish to gallery" onCreated={() => router.push("/dashboard")} />
    </div>
  );
}