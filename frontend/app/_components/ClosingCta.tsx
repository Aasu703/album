import Link from "next/link";

import ScrollReveal from "@/components/ScrollReveal";

/** Final call-to-action band at the bottom of the landing page. */
export default function ClosingCta() {
  return (
    <section className="relative z-[3] flex min-h-screen flex-col items-center justify-center border-t border-hairline bg-background px-6 py-20 text-center">
      <ScrollReveal>
        <h2 className="mx-auto max-w-2xl font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-foreground">
          Start collecting the work you love
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Join a community of collectors and independent artists. It only takes a moment.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-hairline bg-surface px-8 py-3 text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
          >
            Log in
          </Link>
          <Link
            href="/upload"
            className="rounded-full border border-hairline bg-surface px-8 py-3 text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
          >
            ＋ Share your work
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
