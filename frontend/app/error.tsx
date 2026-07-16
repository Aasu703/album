"use client";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Route-level fallback UI for server/client rendering exceptions. */
export default function AppError({ error, reset }: AppErrorProps) {
  console.error("App route error", error);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <section className="max-w-md space-y-3 rounded-2xl border border-hairline bg-surface p-6 text-center shadow-sm">
        <h1 className="font-serif text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted">Please refresh and try again.</p>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
