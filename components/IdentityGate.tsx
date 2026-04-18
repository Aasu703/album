"use client";

import { FormEvent, useState } from "react";

import type { UserIdentity } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

interface IdentityGateProps {
  children: React.ReactNode;
}

interface LoginResponse {
  success: boolean;
  user?: UserIdentity;
  error?: string;
}

/** Blocks app usage until a lightweight persistent user identity is established. */
export default function IdentityGate({ children }: IdentityGateProps) {
  const { identity, isLoading, setIdentity } = useIdentity();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
        }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success || !payload.user) {
        throw new Error(payload.error ?? "Failed to establish identity.");
      }

      setIdentity(payload.user);
      setName("");
      setEmail("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to establish identity.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          Loading your workspace...
        </div>
      </main>
    );
  }

  if (identity) {
    return <>{children}</>;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Welcome</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter your name and email once to personalize uploads and shared event albums.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="identity-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="identity-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="Salman Khan"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="identity-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="identity-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="you@example.com"
            />
          </div>

          {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
