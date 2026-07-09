import { connection } from "next/server";

import PartyCreateForm from "./_components/PartyCreateForm";

/** Renders party creation flow with QR/share details for hosts. */
export default async function PartyCreatePage() {
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-[#E9ECEF] bg-linear-to-br from-[#f4f8ff] via-white to-[#fff9ec] p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">Create a party that feels alive</h1>
        <p className="mt-2 text-sm text-[#6C757D]">
          Set up your party space, share the join code, and let everyone contribute in real time.
        </p>
      </section>

      <PartyCreateForm />
    </main>
  );
}
