import HeroSection from "@/app/_components/HeroSection";
import ShowcaseSection from "@/app/_components/ShowcaseSection";
import AboutSection from "@/app/_components/AboutSection";
import ClosingCta from "@/app/_components/ClosingCta";
import type { Artwork, ArtworkListResult } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const metadata = {
  title: "Album — Discover original art",
  description:
    "Discover original paintings from independent artists. React, comment, and follow the artists you love.",
};

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

export default async function Home() {
  const showcase = await fetchShowcase();

  return (
    <div className="bg-background text-foreground">
      <HeroSection />
      <ShowcaseSection showcase={showcase} />
      <AboutSection />
      <ClosingCta />
    </div>
  );
}
