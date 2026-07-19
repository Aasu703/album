import GalleryFeed from "@/components/GalleryFeed";

export const metadata = {
  title: "Browse Paintings — Painting Gallery",
};

export default async function PaintingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="space-y-1">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Gallery</h1>
        <p className="text-sm text-muted">Browse original paintings from independent artists and react to what you love.</p>
      </section>

      <form className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search paintings..."
          className="min-h-11 flex-1 rounded-full border border-hairline bg-surface px-4 text-sm text-foreground outline-none transition-colors duration-300 ease-out focus:border-accent"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-background transition-colors duration-300 ease-out hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      {/* Infinite scroll: the feed fetches more pages as the visitor nears the bottom.
          `key` resets the feed's internal state when the search term changes. */}
      <GalleryFeed key={search ?? ""} search={search} />
    </main>
  );
}
