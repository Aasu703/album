import Link from "next/link";
import ArcCarousel from "@/components/ArcCarousel";

const PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300",
  "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=300",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300",
];

/** Full-viewport landing hero. Always dark (the `dark` scope) because the arc
 *  carousel, noise texture, and vignette are composed for a cinematic dark stage
 *  regardless of the visitor's chosen app theme. */
export default function HeroSection() {
  return (
    <section className="dark relative h-screen overflow-hidden bg-background text-foreground">
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
  );
}
