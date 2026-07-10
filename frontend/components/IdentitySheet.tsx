"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { UserIdentity } from "@/app/lib/types";

interface IdentitySheetProps {
  isOpen: boolean;
  defaultName?: string;
  defaultEmail?: string;
  guestId?: string | null;
  onClose: () => void;
  onResolved: (identity: UserIdentity) => void;
}

interface LoginResponse {
  success: boolean;
  user?: UserIdentity;
  error?: string;
}

/** Captures lightweight identity details in a mobile sheet / desktop modal. */
export default function IdentitySheet({
  isOpen,
  defaultName = "",
  defaultEmail = "",
  guestId,
  onClose,
  onResolved,
}: IdentitySheetProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(defaultName);
    setEmail(defaultEmail);
    setError(null);
    setIsSubmitting(false);
  }, [defaultEmail, defaultName, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

  const continueLabel = useMemo(() => (isSubmitting ? "Saving..." : "Continue"), [isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail || null,
          guestId: guestId ?? null,
        }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success || !payload.user) {
        throw new Error(payload.error ?? "Unable to save your identity.");
      }

      onResolved(payload.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your identity.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-70">
      <button
        type="button"
        aria-label="Dismiss identity prompt"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <section className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-[#E9ECEF] bg-[#FFFFFF] p-5 shadow-xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E9ECEF] sm:hidden" />

        <header className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#1A1A2E]">Quick, what&apos;s your name?</h2>
          <p className="text-sm text-[#6C757D]">Just your name so others know who shared this.</p>
        </header>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="identity-sheet-name" className="text-sm font-semibold text-[#1A1A2E]">
              Name
            </label>
            <input
              id="identity-sheet-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 text-sm text-[#1A1A2E] outline-none transition focus:border-[#4D96FF]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="identity-sheet-email" className="text-sm font-semibold text-[#1A1A2E]">
              Email (optional, to remember you next time)
            </label>
            <input
              id="identity-sheet-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 text-sm text-[#1A1A2E] outline-none transition focus:border-[#4D96FF]"
            />
          </div>

          {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-full bg-[#4D96FF] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f85ff] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {continueLabel}
          </button>
        </form>
      </section>
    </div>
  );
}
