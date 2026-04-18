import { connection } from "next/server";

import PartyAlbumClient from "./_components/PartyAlbumClient";

interface PartyAlbumPageProps {
  params: Promise<{ join_code: string }>;
}

/** Shared party album page for hosts and guests. */
export default async function PartyAlbumPage({ params }: PartyAlbumPageProps) {
  await connection();

  const { join_code: joinCode } = await params;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PartyAlbumClient joinCode={joinCode} />
    </main>
  );
}
