"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import ArtworkUploadForm from "@/components/ArtworkUploadForm";
import SignedOutGate from "./_components/SignedOutGate";
import AdminGate from "./_components/AdminGate";

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-muted">Loading…</div>;
  }

  if (!user) return <SignedOutGate />;
  // Admins manage the platform rather than post to it.
  if (user.role === "ADMIN") return <AdminGate />;

  // Any signed-in member can share a photo — public to the gallery or private to themselves.
  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">New photo</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground">Share a photo</h1>
        <p className="mt-2 text-sm text-muted">
          Upload an image, add a title and description, and choose whether it&apos;s public or private.
        </p>
      </div>

      <ArtworkUploadForm submitLabel="Share photo" onCreated={() => router.push("/profile")} />
    </div>
  );
}