import Link from "next/link";
import Image from "next/image";
import ArcCarousel from "@/components/ArcCarousel";
import ScrollReveal from "@/components/ScrollReveal";
import type { Artwork, ArtworkListResult, ArtworkPainter } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const metadata = {
  title: "Painting Gallery — Discover original art",
  description:
    "Discover original paintings from independent artists. React, comment, and follow the artists you love.",
};

const PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300",
  "https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=300",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300",
];

function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") return "Independent artist";
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}

/** Best-effort fetch of a few real artworks to showcase on the landing page. */
async function fetchShowcase(): Promise<Artwork[]> {
  try {
    const res = await fetch(`${API_URL}/artworks?limit=6`, { cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json();
    return (payload.data as ArtworkListResult).items ?? [];
  } catch {
    return [];
  }
}

const STEPS = [
  {
    emoji: "🖼️",
    title: "Browse the gallery",
    body: "Explore original paintings from independent artists, updated as new work is posted.",
  },
  {
    emoji: "❤️",
    title: "React & comment",
    body: "Leave a reaction or start a conversation on the pieces that move you.",
  },
  {
    emoji: "🎨",
    title: "Share your work",
    body: "Become a verified painter and upload your own pieces for collectors to discover.",
  },
];

const STATS = [
  { value: "Original", label: "Every piece, one of a kind" },
  { value: "Direct", label: "Straight from the artist" },
  { value: "Curated", label: "A gallery, reimagined" },
];

export default async function Home() {
  const showcase = await fetchShowcase();

  return (
    <div className="bg-background text-foreground">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative h-screen overflow-hidden">
        {/* Noise texture */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.025]"
          aria-hidden="true"
        >
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>

        <ArcCarousel photos={PLACEHOLDER_PHOTOS} />

        {/* Vignette so the headline reads over the arc */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 65%, rgba(11,11,12,0.95) 30%, rgba(11,11,12,0.6) 60%, transparent 100%)",
          }}
        />

        <div className="absolute left-1/2 top-[55%] z-[2] w-full -translate-x-1/2 -translate-y-1/2 px-6 text-center">
          <h1 className="mx-auto max-w-3xl font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-tight text-foreground">
            Original paintings,
            <br />
            shared directly by the artist
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[clamp(0.9rem,2vw,1.1rem)] leading-relaxed text-muted">
            A curated gallery of original work from independent artists. React and comment on
            the pieces you love.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-full border border-hairline bg-surface/60 px-7 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
            >
              Log in
            </Link>
          </div>

          <Link
            href="/upload"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-300 ease-out hover:text-accent"
          >
            <span aria-hidden="true">＋</span> Share your work
          </Link>
        </div>

        <a
          href="#showcase"
          className="absolute bottom-6 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted transition-colors duration-300 ease-out hover:text-accent"
        >
          Scroll to explore
          <span aria-hidden="true" className="animate-bounce text-base">↓</span>
        </a>
      </section>

      {/* ── Showcase ─────────────────────────────────────────────────────── */}
      {showcase.length > 0 ? (
        <section id="showcase" className="relative z-[3] flex min-h-screen flex-col justify-center border-t border-hairline bg-background px-6 py-20">
          <div className="mx-auto w-full max-w-6xl">
            <ScrollReveal>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-accent">The collection</p>
                <h2 className="mt-2 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-foreground">
                  Recently added
                </h2>
              </div>
            </ScrollReveal>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
              {showcase.map((artwork, i) => (
                <ScrollReveal key={artwork.id} delay={i * 80}>
                  <Link
                    href={`/paintings/${artwork.id}`}
                    className="group block overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 ease-out hover:border-accent/60"
                  >
                    <div className="relative aspect-square bg-surface-raised">
                      <Image
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-1 p-4">
                      <h3 className="truncate text-sm font-semibold text-foreground">{artwork.title}</h3>
                      <p className="truncate text-xs text-muted">{painterName(artwork.painterId)}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={120}>
              <div className="mt-12 text-center">
                <Link
                  href="/paintings"
                  className="inline-flex rounded-full border border-hairline bg-surface px-6 py-2.5 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-accent hover:text-accent"
                >
                  View the full gallery
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      ) : null}

      {/* ── About / How it works ─────────────────────────────────────────── */}
      <section id="about" className="relative z-[3] flex min-h-screen flex-col justify-center border-t border-hairline bg-background px-6 py-20">
        <div className="mx-auto w-full max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">About</p>
              <h2 className="mt-2 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-foreground">
                A gallery, reimagined
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Painting Gallery is a home for original art — a place where independent painters
                post their work and collectors react, comment, and follow along. No middlemen, no
                prints, just one-of-a-kind pieces shared directly by the people who made them.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.value} delay={i * 80}>
                <div className="rounded-2xl border border-hairline bg-surface px-6 py-8 text-center">
                  <p className="font-serif text-2xl font-semibold text-accent">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.title} delay={i * 100}>
                <div className="h-full rounded-3xl border border-hairline bg-surface p-8 transition-colors duration-300 ease-out hover:border-accent/50">
                  <span className="text-4xl" aria-hidden="true">
                    {step.emoji}
                  </span>
                  <h3 className="mt-5 font-serif text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
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
    </div>
  );
}
