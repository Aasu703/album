import Link from "next/link";

import GateShell from "./GateShell";

/** Admins manage the gallery but don't post their own artwork (the API restricts
 *  posting to verified artists), so /upload points them to the console instead. */
export default function AdminGate() {
  return (
    <GateShell>
      <span className="text-4xl" aria-hidden="true">🛠️</span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Admins don&apos;t post artwork</h1>
      <p className="mt-2 text-sm text-muted">
        Uploading is reserved for verified painters. Manage the gallery from the admin console.
      </p>
      <Link
        href="/admin"
        className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
      >
        Open admin console
      </Link>
    </GateShell>
  );
}
