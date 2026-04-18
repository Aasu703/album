"use client";

import { useParams } from "next/navigation";

import PartyAlbumClient from "./_components/PartyAlbumClient";

/** Shared party album page for hosts and guests. */
export default function PartyAlbumPage() {
  const params = useParams<{ join_code?: string | string[] }>();
  const rawJoinCode = params?.join_code;
  const joinCode = Array.isArray(rawJoinCode) ? rawJoinCode[0] : rawJoinCode;

  if (!joinCode) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900 dark:bg-rose-950/40">
          <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Invalid party route</h1>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">Join code is missing from the URL.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PartyAlbumClient joinCode={joinCode} />
    </main>
  );
}
