import { connection } from "next/server";

import PartyCreateForm from "./_components/PartyCreateForm";

/** Renders party creation flow with QR/share details for hosts. */
export default async function PartyCreatePage() {
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Create Party</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Create an event album and share a QR code or join link with your guests.
        </p>
      </section>

      <PartyCreateForm />
    </main>
  );
}
