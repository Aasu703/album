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
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-dashed border-hairline bg-surface p-10 text-center shadow-sm">
      <p className="text-4xl" aria-hidden="true">
        {emoji}
      </p>
      <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background shadow-sm transition-all duration-300 ease-out hover:bg-accent-hover hover:shadow-md active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
