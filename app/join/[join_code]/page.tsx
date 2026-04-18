import { connection } from "next/server";

import JoinPartyClient from "./_components/JoinPartyClient";

interface JoinPartyPageProps {
  params: Promise<{ join_code: string }>;
}

/** Landing page used by guests who scan or open a party join link. */
export default async function JoinPartyPage({ params }: JoinPartyPageProps) {
  await connection();

  const { join_code: joinCode } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <JoinPartyClient joinCode={joinCode} />
    </main>
  );
}
