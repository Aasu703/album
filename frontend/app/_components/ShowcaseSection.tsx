import Link from "next/link";
import Image from "next/image";

import ScrollReveal from "@/components/ScrollReveal";
import { painterName } from "@/app/lib/artwork";
import type { Artwork } from "@/app/lib/types";

/** "Recently added" grid of real artworks on the landing page. Renders nothing
 *  when the gallery is empty (or the API is unreachable). */
export default function ShowcaseSection({ showcase }: { showcase: Artwork[] }) {
  if (showcase.length === 0) return null;

  return (
    <section
      id="showcase"
      className="relative z-[3] flex min-h-screen flex-col justify-center border-t border-hairline bg-background px-6 py-20"
    >
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
  );
}
