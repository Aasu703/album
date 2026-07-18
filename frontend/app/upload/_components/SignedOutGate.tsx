import Link from "next/link";

import GateShell from "./GateShell";

/** Shown on /upload to visitors without a session — a soft conversion prompt
 *  rather than an immediate bounce to /login. */
export default function SignedOutGate() {
  return (
    <GateShell>
      <span className="text-4xl" aria-hidden="true">🔒</span>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">Sign in to share your work</h1>
      <p className="mt-2 text-sm text-muted">You need an account to upload paintings to the gallery.</p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/login"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-full border border-hairline bg-surface px-6 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
        >
          Sign up
        </Link>
      </div>
    </GateShell>
  );
}
