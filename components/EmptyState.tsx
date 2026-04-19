import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  emoji?: string;
  actionLabel?: string;
  actionHref?: string;
}

/** Reusable friendly empty-state block with optional call to action. */
export default function EmptyState({
  title,
  description,
  emoji = "📸",
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-dashed border-[#E9ECEF] bg-white p-10 text-center shadow-sm">
      <p className="text-4xl" aria-hidden="true">
        {emoji}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1A1A2E]">{title}</h2>
      <p className="mt-2 text-sm text-[#6C757D]">{description}</p>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#4D96FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D96FF]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
