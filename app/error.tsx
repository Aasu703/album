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
      <section className="max-w-md space-y-3 rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">Please refresh and try again.</p>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
