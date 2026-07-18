import type { Artwork, ArtworkPainter } from "@/app/lib/types";

/** Human-readable painter name for an artwork, whether the painter field is a
 *  populated object or just an id string. Shared across the landing, dashboard,
 *  and gallery so the fallback label stays consistent. */
export function painterName(painterId: Artwork["painterId"]): string {
  if (typeof painterId === "string") return "Independent artist";
  const painter = painterId as ArtworkPainter;
  return `${painter.firstName} ${painter.lastName}`;
}
