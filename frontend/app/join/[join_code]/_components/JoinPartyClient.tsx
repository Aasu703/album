"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";

import type { ApiResponse, PartyWithJoinUrl } from "@/app/lib/types";
import Avatar from "@/components/Avatar";
import { useIdentity } from "@/components/IdentityProvider";

interface JoinPartyClientProps {
  joinCode: string;
}

/** Plays a subtle celebration burst when someone joins a party for the first time. */
function fireJoinConfetti() {
  confetti({
    particleCount: 60,
    spread: 65,
    origin: { y: 0.65 },
    colors: ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFC93C", "#C77DFF"],
  });
}

/** Loads party details and lets the current user join with one action. */
export default function JoinPartyClient({ joinCode }: JoinPartyClientProps) {
  const router = useRouter();
  const { identity, requestIdentity } = useIdentity();
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
    if (joining) {
      return;
    }

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/parties/${joinCode}/join`, {
        method: "POST",
      });

      const payload = (await response.json()) as ApiResponse<{ joined: boolean; first_join?: boolean }>;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Unable to join this party.");
      }

      if (payload.data?.first_join) {
        fireJoinConfetti();
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
          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#E9ECEF] bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(77,150,255,0.13),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(107,203,119,0.14),transparent_45%)]" />

      <header className="relative space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-[#1A1A2E] sm:text-5xl">{party.name}</h1>
        <p className="text-sm font-semibold text-[#6C757D]">Hosted by {party.host_name}</p>
        {party.description ? (
          <p className="mx-auto max-w-xl text-sm text-[#1A1A2E]">{party.description}</p>
        ) : null}
      </header>

      {party.members && party.members.length > 0 ? (
        <div className="relative mt-5 flex items-center justify-center">
          <div className="flex items-center">
            {party.members.slice(0, 8).map((member, index) => (
              <div key={`${member.user_id}-${member.user_name}`} className={index === 0 ? "" : "-ml-2"}>
                <Avatar name={member.user_name} color={member.avatar_color} size="sm" />
              </div>
            ))}
          </div>
          <p className="ml-3 text-xs font-semibold text-[#6C757D]">
            {party.members.length} {party.members.length === 1 ? "member" : "members"}
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#FF6B6B]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={joining}
        className="relative mt-6 min-h-12 w-full rounded-full bg-[#4D96FF] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {joining ? "Joining..." : "Join Party"}
      </button>
    </section>
  );
}
