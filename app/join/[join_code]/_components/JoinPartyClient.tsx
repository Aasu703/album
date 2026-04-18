"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { ApiResponse, PartyWithJoinUrl } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

interface JoinPartyClientProps {
  joinCode: string;
}

/** Loads party details and lets the current user join with one action. */
export default function JoinPartyClient({ joinCode }: JoinPartyClientProps) {
  const router = useRouter();
  const { identity } = useIdentity();
  const [party, setParty] = useState<PartyWithJoinUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadParty = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/parties/${joinCode}`);
      const payload = (await response.json()) as ApiResponse<PartyWithJoinUrl>;

      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error ?? "Unable to load party details.");
      }

      setParty(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load party details.");
      setParty(null);
    } finally {
      setLoading(false);
    }
  }, [joinCode]);

  useEffect(() => {
    void loadParty();
  }, [loadParty]);

  async function handleJoin() {
    if (!identity || joining) {
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/parties/${joinCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: identity.id,
          user_name: identity.name,
        }),
      });

      const payload = (await response.json()) as ApiResponse<{ joined: boolean }>;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Unable to join this party.");
      }

      router.push(`/party/${joinCode}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join this party.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        Loading party details...
      </section>
    );
  }

  if (error || !party) {
    return (
      <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900 dark:bg-rose-950/40">
        <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Unable to join party</h1>
        <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? "Party details are unavailable."}</p>
        <button
          type="button"
          onClick={() => void loadParty()}
          className="min-h-11 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{party.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Hosted by {party.host_name}</p>
        {party.description ? (
          <p className="text-sm text-gray-700 dark:text-gray-200">{party.description}</p>
        ) : null}
      </header>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={joining}
        className="min-h-11 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
      >
        {joining ? "Joining..." : "Join Party"}
      </button>
    </section>
  );
}
